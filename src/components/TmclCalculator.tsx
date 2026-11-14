import React, { useMemo, useState } from "react";
import { RotateCcw, Building2, Clock, Wallet } from "lucide-react";
import type { CommuteMode, ComputedProperty, OfficeHub, Property } from "../types/rental";
import { calculateCommuteMetrics, formatINR, getDefaultUtilities } from "../utils/calculations";

interface TmclCalculatorProps {
  allProperties: ComputedProperty[];
  rawProperties: Property[];
  selectedPropertyId: string;
  onSelectPropertyId: (id: string) => void;
  selectedHub: OfficeHub;
  commuteMode: CommuteMode;
  onChangeCommuteMode: (mode: CommuteMode) => void;
  maxBudget: number;
  utilitiesCost: number;
  onChangeUtilitiesCost: (val: number) => void;
  maidCookCost: number;
  onChangeMaidCookCost: (val: number) => void;
  tankerBuffer: number;
  onChangeTankerBuffer: (val: number) => void;
  includeDepositCost: boolean;
  onToggleDepositCost: (val: boolean) => void;
  onResetDefaults: (prop: Property) => void;
}

const COMMUTE_MODES: CommuteMode[] = ["Car", "Two-Wheeler", "Cab/Auto", "Metro + Feeder"];

export const TmclCalculator: React.FC<TmclCalculatorProps> = ({
  allProperties,
  rawProperties,
  selectedPropertyId,
  onSelectPropertyId,
  selectedHub,
  commuteMode,
  onChangeCommuteMode,
  maxBudget,
  utilitiesCost,
  onChangeUtilitiesCost,
  maidCookCost,
  onChangeMaidCookCost,
  tankerBuffer,
  onChangeTankerBuffer,
  includeDepositCost,
  onToggleDepositCost,
  onResetDefaults,
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const property = useMemo(
    () =>
      allProperties.find((p) => p.id === selectedPropertyId) ??
      allProperties[0],
    [allProperties, selectedPropertyId]
  );

  const rawProperty = useMemo(
    () => rawProperties.find((p) => p.id === property.id) ?? rawProperties[0],
    [rawProperties, property.id]
  );

  const commute = useMemo(
    () => calculateCommuteMetrics(rawProperty, selectedHub.id, commuteMode),
    [rawProperty, selectedHub.id, commuteMode]
  );

  const depositOpportunityMonthly = includeDepositCost
    ? Math.round((property.securityDeposit * 0.07) / 12)
    : 0;

  const maintAndWater = property.maintenanceCharges + tankerBuffer;
  const utilitiesAndHelp = utilitiesCost + maidCookCost;

  const totalSimulatedTmcl =
    property.baseRent +
    maintAndWater +
    commute.monthlyCommuteCost +
    utilitiesAndHelp +
    depositOpportunityMonthly;

  const segments = useMemo(() => {
    const raw = [
      {
        key: "baseRent",
        label: "Base Rent",
        value: property.baseRent,
        color: "#0F172A",
      },
      {
        key: "deposit",
        label: "Deposit Opportunity Cost (7% p.a.)",
        value: depositOpportunityMonthly,
        color: "#4F46E5",
      },
      {
        key: "commute",
        label: `Commute (${commuteMode})`,
        value: commute.monthlyCommuteCost,
        color: "#F59E0B",
      },
      {
        key: "maint",
        label: "Maintenance & Water Tanker",
        value: maintAndWater,
        color: "#3B82F6",
      },
      {
        key: "utils",
        label: "BESCOM, Fiber & Maid/Cook",
        value: utilitiesAndHelp,
        color: "#94A3B8",
      },
    ].filter((s) => s.value > 0);

    const total = raw.reduce((acc, s) => acc + s.value, 0) || 1;
    let cumulative = 0;
    return raw.map((s) => {
      const pct = s.value / total;
      const startAngle = cumulative * 2 * Math.PI;
      cumulative += pct;
      const endAngle = cumulative * 2 * Math.PI;
      return {
        ...s,
        pct,
        startAngle,
        endAngle,
      };
    });
  }, [
    property.baseRent,
    depositOpportunityMonthly,
    commuteMode,
    commute.monthlyCommuteCost,
    maintAndWater,
    utilitiesAndHelp,
  ]);

  const activeSlice = segments.find((s) => s.key === hoveredSlice) ?? null;
  const deltaVsBudget = totalSimulatedTmcl - maxBudget;
  const upfrontCash = property.securityDeposit + property.baseRent + property.maintenanceCharges;

  const size = 240;
  const center = size / 2;
  const radius = 88;
  const strokeW = 28;
  const circumference = 2 * Math.PI * radius;

  let arcOffset = 0;

  return (
    <div className="space-y-6">
      {/* Property Selector Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="sim-property-select"
            className="block text-xs font-medium text-slate-500 mb-1"
          >
            Active Simulated Residence (Commuting to {selectedHub.name})
          </label>
          <select
            id="sim-property-select"
            value={property.id}
            onChange={(e) => {
              const next = rawProperties.find((p) => p.id === e.target.value);
              onSelectPropertyId(e.target.value);
              if (next) {
                onChangeUtilitiesCost(getDefaultUtilities(next.bhk, 0));
                onChangeTankerBuffer(next.tankerSurchargeEst);
              }
            }}
            className="w-full max-w-xl bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            {allProperties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.societyName} · {p.name} ({p.bhk} · {p.locality} · Base {formatINR(p.baseRent)})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => onResetDefaults(rawProperty)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Society Defaults
        </button>
      </div>

      {/* Main 2-Column Calculator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Controls & Sliders (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Living & Commute Cost Controls
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Adjust monthly household variables to stress-test True Monthly Cost of Living (TMCL)
            </p>
          </div>

          {/* Commute Mode Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">
                Daily Commute Mode ({commute.roadDistanceKm} km to {selectedHub.shortName})
              </span>
              <span className="font-mono-num text-xs font-semibold text-slate-900">
                {commute.peakCommuteMinutes} min/trip · {commute.monthlyTrafficHours} hrs/mo
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {COMMUTE_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChangeCommuteMode(mode)}
                  className={`px-2.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    commuteMode === mode
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* BESCOM & Utilities Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="slider-utilities" className="text-xs font-semibold text-slate-700">
                BESCOM Electricity, Fiber & Cooking Gas
              </label>
              <span className="font-mono-num text-sm font-bold text-indigo-600">
                {formatINR(utilitiesCost)}/mo
              </span>
            </div>
            <input
              id="slider-utilities"
              type="range"
              min={1000}
              max={10000}
              step={200}
              value={utilitiesCost}
              onChange={(e) => onChangeUtilitiesCost(Number(e.target.value))}
              className="vanguard-slider w-full"
              style={{
                background: `linear-gradient(to right, #4f46e5 ${
                  ((utilitiesCost - 1000) / 9000) * 100
                }%, #e2e8f0 ${((utilitiesCost - 1000) / 9000) * 100}%)`,
              }}
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono-num mt-1">
              <span>₹1,000</span>
              <span>Typical 2BHK: ₹3,200</span>
              <span>₹10,000</span>
            </div>
          </div>

          {/* Maid & Cook Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="slider-maid" className="text-xs font-semibold text-slate-700">
                Domestic Help (Maid & Cook)
              </label>
              <span className="font-mono-num text-sm font-bold text-indigo-600">
                {formatINR(maidCookCost)}/mo
              </span>
            </div>
            <input
              id="slider-maid"
              type="range"
              min={0}
              max={12000}
              step={500}
              value={maidCookCost}
              onChange={(e) => onChangeMaidCookCost(Number(e.target.value))}
              className="vanguard-slider w-full"
              style={{
                background: `linear-gradient(to right, #4f46e5 ${(maidCookCost / 12000) * 100}%, #e2e8f0 ${
                  (maidCookCost / 12000) * 100
                }%)`,
              }}
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono-num mt-1">
              <span>₹0 (Self)</span>
              <span>Maid + Cook avg: ₹5,500</span>
              <span>₹12,000</span>
            </div>
          </div>

          {/* Water Tanker Buffer Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="slider-tanker" className="text-xs font-semibold text-slate-700">
                Seasonal Water Tanker Surcharge ({property.waterReliability} Reliability)
              </label>
              <span className="font-mono-num text-sm font-bold text-indigo-600">
                {formatINR(tankerBuffer)}/mo
              </span>
            </div>
            <input
              id="slider-tanker"
              type="range"
              min={0}
              max={4000}
              step={100}
              value={tankerBuffer}
              onChange={(e) => onChangeTankerBuffer(Number(e.target.value))}
              className="vanguard-slider w-full"
              style={{
                background: `linear-gradient(to right, #4f46e5 ${(tankerBuffer / 4000) * 100}%, #e2e8f0 ${
                  (tankerBuffer / 4000) * 100
                }%)`,
              }}
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono-num mt-1">
              <span>₹0 (Cauvery)</span>
              <span>Tanker-heavy summer: ₹1,800+</span>
              <span>₹4,000</span>
            </div>
          </div>

          {/* Deposit Opportunity Cost Toggle */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-900">
                Include Security Deposit Opportunity Cost
              </div>
              <div className="text-xs text-slate-500">
                7% p.a. foregone yield on {formatINR(property.securityDeposit)} locked deposit (
                {formatINR((property.securityDeposit * 0.07) / 12)}/mo)
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={includeDepositCost}
              onClick={() => onToggleDepositCost(!includeDepositCost)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                includeDepositCost ? "bg-indigo-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  includeDepositCost ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Right: Interactive Donut & Financial Readout (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                TMCL Expense Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Hover segments to inspect monthly allocation
              </p>
            </div>
            <span
              className={`font-mono-num text-xs font-semibold ${
                deltaVsBudget > 0 ? "text-rose-700" : "text-emerald-700"
              }`}
            >
              {deltaVsBudget > 0
                ? `${formatINR(deltaVsBudget)} over budget`
                : `${formatINR(Math.abs(deltaVsBudget))} under budget`}
            </span>
          </div>

          {/* Interactive SVG Donut */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90">
                {segments.map((seg) => {
                  const segLength = seg.pct * circumference;
                  const dashArray = `${Math.max(0, segLength - 2)} ${circumference}`;
                  const dashOffset = -arcOffset;
                  arcOffset += segLength;
                  const isHovered = hoveredSlice === seg.key;

                  return (
                    <circle
                      key={seg.key}
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={isHovered ? strokeW + 5 : strokeW}
                      strokeDasharray={dashArray}
                      strokeDashoffset={dashOffset}
                      onMouseEnter={() => setHoveredSlice(seg.key)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      className="cursor-pointer transition-all duration-150"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
                <span className="text-[11px] font-medium text-slate-500 truncate max-w-[140px]">
                  {activeSlice ? activeSlice.label : "True Monthly Cost"}
                </span>
                <span className="font-mono-num text-2xl font-bold text-slate-900 mt-0.5">
                  {formatINR(activeSlice ? activeSlice.value : totalSimulatedTmcl)}
                </span>
                <span className="text-[11px] font-mono-num text-slate-500">
                  {activeSlice
                    ? `${Math.round(activeSlice.pct * 100)}% of TMCL`
                    : "/ month"}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Legend Table */}
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {segments.map((seg) => (
              <div
                key={seg.key}
                onMouseEnter={() => setHoveredSlice(seg.key)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`flex items-center justify-between py-2.5 px-2 rounded transition-colors cursor-pointer ${
                  hoveredSlice === seg.key ? "bg-slate-50" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-xs text-slate-700 truncate">{seg.label}</span>
                </div>
                <div className="flex items-center gap-3 font-mono-num shrink-0">
                  <span className="text-xs font-semibold text-slate-900">
                    {formatINR(seg.value)}
                  </span>
                  <span className="text-[11px] text-slate-400 w-9 text-right">
                    {Math.round(seg.pct * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Annualized & Upfront Cash Summary */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200">
            <div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Wallet className="w-3 h-3" /> Move-In Cash
              </div>
              <div className="font-mono-num text-sm font-bold text-slate-900 mt-0.5">
                {formatINR(upfrontCash)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Building2 className="w-3 h-3" /> 12-Mo Outflow
              </div>
              <div className="font-mono-num text-sm font-bold text-slate-900 mt-0.5">
                {formatINR(totalSimulatedTmcl * 12)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Clock className="w-3 h-3" /> Traffic / Yr
              </div>
              <div className="font-mono-num text-sm font-bold text-slate-900 mt-0.5">
                {Math.round(commute.monthlyTrafficHours * 12)} hrs
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
