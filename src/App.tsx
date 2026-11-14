import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { ALL_LOCALITIES, OFFICE_HUBS, PROPERTIES } from "./data/bengaluruData";
import type {
  AITradeoffExplanation,
  BhkType,
  CommuteMode,
  LocalityName,
  PriorityWeights,
  Property,
} from "./types/rental";
import { computePropertyMetrics, formatINR, getDefaultUtilities } from "./utils/calculations";
import { BengaluruMap } from "./components/BengaluruMap";
import { PropertyCard } from "./components/PropertyCard";
import { PropertyDetailModal } from "./components/PropertyDetailModal";
import { TradeOffInsightsPanel } from "./components/TradeOffInsightsPanel";
import { TmclCalculator } from "./components/TmclCalculator";
import { MarketAnalytics } from "./components/MarketAnalytics";
import { CompareMatrix } from "./components/CompareMatrix";
import { AiAdvisorDrawer } from "./components/AiAdvisorDrawer";

type ActiveTab = "discover" | "calculator" | "analytics" | "compare";

const COMMUTE_MODES: CommuteMode[] = ["Car", "Two-Wheeler", "Cab/Auto", "Metro + Feeder"];
const BHK_OPTIONS: Array<"All" | BhkType> = ["All", "1BHK", "2BHK", "3BHK"];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("discover");

  // Core Persistent Filter & Scoring State
  const [hubId, setHubId] = useState<string>("ecoworld");
  const [commuteMode, setCommuteMode] = useState<CommuteMode>("Car");
  const [bhkFilter, setBhkFilter] = useState<"All" | BhkType>("All");
  const [localityFilter, setLocalityFilter] = useState<"All" | LocalityName>("All");
  const [maxBudget, setMaxBudget] = useState<number>(48000);
  const [weights, setWeights] = useState<PriorityWeights>({
    cost: 40,
    commute: 35,
    amenities: 25,
  });

  // Interactive Selection & Compare State
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("bl-sobha-2bhk");
  const [detailModalPropertyId, setDetailModalPropertyId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([
    "bl-sobha-2bhk",
    "sj-godrej-2bhk",
    "wf-cosmopolis-2bhk",
  ]);

  // TMCL Simulator State
  const [simPropertyId, setSimPropertyId] = useState<string>("bl-sobha-2bhk");
  const [simUtilities, setSimUtilities] = useState<number>(3200);
  const [simMaidCook, setSimMaidCook] = useState<number>(5000);
  const [simTankerBuffer, setSimTankerBuffer] = useState<number>(800);
  const [simIncludeDepositCost, setSimIncludeDepositCost] = useState<boolean>(true);

  // AI State
  const [isAdvisorOpen, setIsAdvisorOpen] = useState<boolean>(false);
  const [tradeoffExplanations, setTradeoffExplanations] = useState<AITradeoffExplanation[]>([]);
  const [isLoadingTradeoffs, setIsLoadingTradeoffs] = useState<boolean>(false);
  const [tradeoffError, setTradeoffError] = useState<string | null>(null);
  const lastTradeoffSignature = useRef<string>("");

  const selectedHub = useMemo(
    () => OFFICE_HUBS.find((h) => h.id === hubId) ?? OFFICE_HUBS[0],
    [hubId]
  );

  // Compute live metrics + SmartMatch score for all 18 properties
  const allComputedProperties = useMemo(() => {
    return PROPERTIES.map((prop) =>
      computePropertyMetrics(prop, hubId, commuteMode, maxBudget, weights)
    ).sort((a, b) => b.smartMatchScore - a.smartMatchScore);
  }, [hubId, commuteMode, maxBudget, weights]);

  // Apply user BHK and Locality filters while keeping SmartMatch sort order
  const filteredProperties = useMemo(() => {
    return allComputedProperties.filter((p) => {
      if (bhkFilter !== "All" && p.bhk !== bhkFilter) return false;
      if (localityFilter !== "All" && p.locality !== localityFilter) return false;
      return true;
    });
  }, [allComputedProperties, bhkFilter, localityFilter]);

  const top3Properties = useMemo(() => filteredProperties.slice(0, 3), [filteredProperties]);

  const detailProperty = useMemo(
    () => allComputedProperties.find((p) => p.id === detailModalPropertyId) ?? null,
    [allComputedProperties, detailModalPropertyId]
  );

  const handleLoadIntoSimulator = useCallback((propertyId: string) => {
    const raw = PROPERTIES.find((p) => p.id === propertyId);
    setSimPropertyId(propertyId);
    if (raw) {
      setSimUtilities(getDefaultUtilities(raw.bhk, 0));
      setSimTankerBuffer(raw.tankerSurchargeEst);
    }
    setActiveTab("calculator");
  }, []);

  const handleResetCalculatorDefaults = useCallback((prop: Property) => {
    setSimUtilities(getDefaultUtilities(prop.bhk, 0));
    setSimMaidCook(5000);
    setSimTankerBuffer(prop.tankerSurchargeEst);
    setSimIncludeDepositCost(true);
  }, []);

  const handleToggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }, []);

  const fetchTradeoffs = useCallback(
    async (force = false) => {
      if (top3Properties.length === 0) return;

      const signature = `${hubId}|${commuteMode}|${maxBudget}|${top3Properties
        .map((p) => p.id)
        .join(",")}`;
      if (!force && lastTradeoffSignature.current === signature) return;
      lastTradeoffSignature.current = signature;

      setIsLoadingTradeoffs(true);
      setTradeoffError(null);

      try {
        const payload = {
          officeHubName: selectedHub.name,
          commuteMode,
          maxBudget,
          topProperties: top3Properties.map((top) => {
            // Find a lower baseRent alternative in the portfolio for trade-off comparison
            const cheaper =
              filteredProperties
                .filter((alt) => alt.id !== top.id && alt.baseRent < top.baseRent)
                .sort((a, b) => a.baseRent - b.baseRent)[0] ??
              allComputedProperties.find((alt) => alt.id !== top.id && alt.baseRent < top.baseRent);

            return {
              id: top.id,
              name: top.name,
              societyName: top.societyName,
              locality: top.locality,
              bhk: top.bhk,
              baseRent: top.baseRent,
              maintenanceCharges: top.maintenanceCharges,
              trueMonthlyCost: top.trueMonthlyCost,
              monthlyCommuteCost: top.monthlyCommuteCost,
              peakCommuteMinutes: top.peakCommuteMinutes,
              monthlyTrafficHours: top.monthlyTrafficHours,
              waterReliability: top.waterReliability,
              smartMatchScore: top.smartMatchScore,
              cheaperAlternative: cheaper
                ? {
                    name: `${cheaper.societyName} (${cheaper.bhk})`,
                    locality: cheaper.locality,
                    baseRent: cheaper.baseRent,
                    trueMonthlyCost: cheaper.trueMonthlyCost,
                    monthlyCommuteCost: cheaper.monthlyCommuteCost,
                    monthlyTrafficHours: cheaper.monthlyTrafficHours,
                  }
                : undefined,
            };
          }),
        };

        const res = await fetch("/api/ai/tradeoffs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = (await res.json()) as {
          explanations?: AITradeoffExplanation[];
          error?: string;
        };

        if (!res.ok || !data.explanations) {
          throw new Error(data.error || "Unable to fetch Gemini trade-off explanations");
        }

        setTradeoffExplanations(data.explanations);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "AI insight service unavailable";
        setTradeoffError(msg);
      } finally {
        setIsLoadingTradeoffs(false);
      }
    },
    [
      top3Properties,
      hubId,
      commuteMode,
      maxBudget,
      selectedHub.name,
      filteredProperties,
      allComputedProperties,
    ]
  );

  // Debounce AI tradeoff refresh when filters or top-3 change
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTradeoffs(false);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [fetchTradeoffs]);

  const resetAllFilters = () => {
    setBhkFilter("All");
    setLocalityFilter("All");
    setMaxBudget(55000);
    setWeights({ cost: 40, commute: 35, amenities: 25 });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Bar Contract: Exactly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("discover");
            }}
            className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            NammaRent Intel
          </a>

          {/* Zone 2: Clean single-line text nav links */}
          <nav
            className="hidden md:flex items-center gap-7 text-sm font-medium"
            aria-label="Primary sections"
          >
            {(
              [
                { id: "discover", label: "Discover" },
                { id: "calculator", label: "TMCL Calculator" },
                { id: "analytics", label: "Market Analytics" },
                { id: "compare", label: `Compare (${compareIds.length})` },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? "border-indigo-600 text-slate-900 font-semibold"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsAdvisorOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask NammaRent AI
            </button>
          </div>
        </div>

        {/* Mobile Nav Strip */}
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {(
            [
              { id: "discover", label: "Discover" },
              { id: "calculator", label: "TMCL Calculator" },
              { id: "analytics", label: "Analytics" },
              { id: "compare", label: `Compare (${compareIds.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-6">
        {/* Global Commute & Budget Parameter Toolbar */}
        <section
          className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5"
          aria-label="Commute and budget filters"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 items-end">
            {/* Office Hub Selector */}
            <div className="xl:col-span-3">
              <label
                htmlFor="hub-select"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Target Office Hub
              </label>
              <select
                id="hub-select"
                value={hubId}
                onChange={(e) => setHubId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                {OFFICE_HUBS.map((hub) => (
                  <option key={hub.id} value={hub.id}>
                    {hub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Commute Mode Segmented Control */}
            <div className="xl:col-span-4">
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Commute Mode (22 working days/mo)
              </span>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
                {COMMUTE_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCommuteMode(mode)}
                    className={`px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors truncate cursor-pointer ${
                      commuteMode === mode
                        ? "bg-white text-slate-900 shadow-xs font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title={mode}
                  >
                    {mode === "Two-Wheeler"
                      ? "2-Wheeler"
                      : mode === "Metro + Feeder"
                        ? "Metro+"
                        : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* BHK Filter */}
            <div className="xl:col-span-2">
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Configuration
              </span>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
                {BHK_OPTIONS.map((bhk) => (
                  <button
                    key={bhk}
                    type="button"
                    onClick={() => setBhkFilter(bhk)}
                    className={`px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      bhkFilter === bhk
                        ? "bg-white text-slate-900 shadow-xs font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {bhk}
                  </button>
                ))}
              </div>
            </div>

            {/* Max TMCL Budget Slider */}
            <div className="xl:col-span-3">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="budget-slider" className="text-xs font-semibold text-slate-700">
                  Max TMCL Budget
                </label>
                <span className="font-mono-num text-xs font-bold text-indigo-600">
                  {formatINR(maxBudget)}/mo
                </span>
              </div>
              <input
                id="budget-slider"
                type="range"
                min={20000}
                max={90000}
                step={1000}
                value={maxBudget}
                onChange={(e) => setMaxBudget(Number(e.target.value))}
                className="vanguard-slider w-full"
                style={{
                  background: `linear-gradient(to right, #4f46e5 ${
                    ((maxBudget - 20000) / 70000) * 100
                  }%, #e2e8f0 ${((maxBudget - 20000) / 70000) * 100}%)`,
                }}
              />
            </div>
          </div>

          {/* Locality Filter Strip + SmartMatch Weight Sliders */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 mr-1">Locality:</span>
              <button
                type="button"
                onClick={() => setLocalityFilter("All")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  localityFilter === "All"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200/70"
                }`}
              >
                All ({allComputedProperties.length})
              </button>
              {ALL_LOCALITIES.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocalityFilter(loc)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    localityFilter === loc
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200/70"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>

            {/* 3 Multi-Variable SmartMatch Priority Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:w-[540px] shrink-0">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-medium text-slate-600">Cost Weight</span>
                  <span className="font-mono-num font-semibold text-slate-900">
                    {weights.cost}%
                  </span>
                </div>
                <input
                  aria-label="Cost priority weight"
                  type="range"
                  min={0}
                  max={100}
                  value={weights.cost}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, cost: Number(e.target.value) }))
                  }
                  className="vanguard-slider w-full"
                  style={{
                    background: `linear-gradient(to right, #4f46e5 ${weights.cost}%, #e2e8f0 ${weights.cost}%)`,
                  }}
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-medium text-slate-600">Commute Weight</span>
                  <span className="font-mono-num font-semibold text-slate-900">
                    {weights.commute}%
                  </span>
                </div>
                <input
                  aria-label="Commute priority weight"
                  type="range"
                  min={0}
                  max={100}
                  value={weights.commute}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, commute: Number(e.target.value) }))
                  }
                  className="vanguard-slider w-full"
                  style={{
                    background: `linear-gradient(to right, #4f46e5 ${weights.commute}%, #e2e8f0 ${weights.commute}%)`,
                  }}
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-medium text-slate-600">Amenities & Water</span>
                  <span className="font-mono-num font-semibold text-slate-900">
                    {weights.amenities}%
                  </span>
                </div>
                <input
                  aria-label="Amenities and water priority weight"
                  type="range"
                  min={0}
                  max={100}
                  value={weights.amenities}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, amenities: Number(e.target.value) }))
                  }
                  className="vanguard-slider w-full"
                  style={{
                    background: `linear-gradient(to right, #4f46e5 ${weights.amenities}%, #e2e8f0 ${weights.amenities}%)`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Active View Content */}
        {activeTab === "discover" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 55% (7 cols): Spatial Map + Gemini AI Trade-Off Panel */}
            <div className="lg:col-span-6 xl:col-span-6 space-y-6 lg:sticky lg:top-20">
              <BengaluruMap
                properties={filteredProperties}
                selectedHub={selectedHub}
                selectedPropertyId={selectedPropertyId}
                onSelectProperty={(id) => setSelectedPropertyId(id)}
              />

              <TradeOffInsightsPanel
                topProperties={top3Properties}
                explanations={tradeoffExplanations}
                isLoading={isLoadingTradeoffs}
                error={tradeoffError}
                onRefresh={() => fetchTradeoffs(true)}
                onSelectProperty={(id) => setSelectedPropertyId(id)}
              />
            </div>

            {/* Right 45% (6 cols): SmartMatch Ranked Property Cards */}
            <div className="lg:col-span-6 xl:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-lg font-bold text-slate-900">
                    SmartMatch Ranked Residences ({filteredProperties.length})
                  </h1>
                  <p className="text-xs text-slate-500">
                    Sorted dynamically by weighted Cost, Commute to {selectedHub.shortName} &
                    Livability
                  </p>
                </div>
              </div>

              {filteredProperties.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
                  <p className="text-sm font-medium text-slate-700">
                    No properties match your current BHK and locality combination.
                  </p>
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredProperties.map((prop) => (
                    <PropertyCard
                      key={prop.id}
                      property={prop}
                      isSelected={selectedPropertyId === prop.id}
                      isCompared={compareIds.includes(prop.id)}
                      canAddToCompare={compareIds.length < 3}
                      onSelect={() => setSelectedPropertyId(prop.id)}
                      onSimulate={() => handleLoadIntoSimulator(prop.id)}
                      onToggleCompare={() => handleToggleCompare(prop.id)}
                      onViewDetails={() => setDetailModalPropertyId(prop.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "calculator" && (
          <TmclCalculator
            allProperties={allComputedProperties}
            rawProperties={PROPERTIES}
            selectedPropertyId={simPropertyId}
            onSelectPropertyId={setSimPropertyId}
            selectedHub={selectedHub}
            commuteMode={commuteMode}
            onChangeCommuteMode={setCommuteMode}
            maxBudget={maxBudget}
            utilitiesCost={simUtilities}
            onChangeUtilitiesCost={setSimUtilities}
            maidCookCost={simMaidCook}
            onChangeMaidCookCost={setSimMaidCook}
            tankerBuffer={simTankerBuffer}
            onChangeTankerBuffer={setSimTankerBuffer}
            includeDepositCost={simIncludeDepositCost}
            onToggleDepositCost={setSimIncludeDepositCost}
            onResetDefaults={handleResetCalculatorDefaults}
          />
        )}

        {activeTab === "analytics" && (
          <MarketAnalytics
            allProperties={allComputedProperties}
            selectedHub={selectedHub}
          />
        )}

        {activeTab === "compare" && (
          <CompareMatrix
            allProperties={allComputedProperties}
            compareIds={compareIds}
            onUpdateCompareIds={setCompareIds}
            selectedHub={selectedHub}
            onSimulate={handleLoadIntoSimulator}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <PropertyDetailModal
        property={detailProperty}
        hubName={selectedHub.shortName}
        onClose={() => setDetailModalPropertyId(null)}
        onSimulate={handleLoadIntoSimulator}
      />

      <AiAdvisorDrawer
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        selectedHub={selectedHub}
        commuteMode={commuteMode}
        maxBudget={maxBudget}
        bhkFilter={bhkFilter}
        localityFilter={localityFilter}
        weights={weights}
        properties={filteredProperties}
      />
    </div>
  );
}
