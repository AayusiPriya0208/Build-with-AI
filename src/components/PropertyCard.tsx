import React from "react";
import { Calculator, Check, Clock, Droplets, GitCompare, LineChart, Train } from "lucide-react";
import type { ComputedProperty } from "../types/rental";
import { formatINR } from "../utils/calculations";
import { SmartMatchGauge } from "./SmartMatchGauge";

interface PropertyCardProps {
  property: ComputedProperty;
  isSelected: boolean;
  isCompared: boolean;
  canAddToCompare: boolean;
  onSelect: () => void;
  onSimulate: () => void;
  onToggleCompare: () => void;
  onViewDetails: () => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  isSelected,
  isCompared,
  canAddToCompare,
  onSelect,
  onSimulate,
  onToggleCompare,
  onViewDetails,
}) => {
  const isOverBudget = property.budgetDelta > 0;
  const commuteFrictionLabel =
    property.peakCommuteMinutes <= 25
      ? "Fast Corridor"
      : property.peakCommuteMinutes <= 45
        ? "Moderate Peak"
        : "Heavy Traffic";

  const commuteTextColor =
    property.peakCommuteMinutes <= 25
      ? "text-emerald-700"
      : property.peakCommuteMinutes <= 45
        ? "text-amber-700"
        : "text-rose-700";

  const waterTextColor =
    property.waterReliability === "High"
      ? "text-emerald-700"
      : property.waterReliability === "Moderate"
        ? "text-amber-700"
        : "text-rose-700";

  return (
    <article
      onClick={onSelect}
      className={`bg-white rounded-lg border transition-all duration-150 cursor-pointer ${
        isSelected
          ? "border-indigo-600 shadow-md"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="p-4 sm:p-5">
        {/* Top Row: Title + Unboxed Metadata + SmartMatch Radial */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-slate-900 truncate">
              {property.societyName} · {property.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{property.bhk}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">{property.areaSqFt.toLocaleString("en-IN")} sq.ft</span>
              <span aria-hidden="true">·</span>
              <span>{property.locality}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Train className="w-3 h-3 text-slate-400" />
                {property.nearbyDistances.metroKm} km Metro
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-600">{property.highlightNote}</p>
          </div>
          <SmartMatchGauge score={property.smartMatchScore} />
        </div>

        {/* Core 3-Column Financial & Commute Telemetry Strip */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-[11px] font-medium text-slate-500">True Monthly Cost (TMCL)</div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-mono-num text-lg font-bold text-slate-900">
                {formatINR(property.trueMonthlyCost)}
              </span>
              <span
                className={`font-mono-num text-[11px] font-semibold ${
                  isOverBudget ? "text-rose-700" : "text-emerald-700"
                }`}
              >
                {isOverBudget
                  ? `+${formatINR(property.budgetDelta)}`
                  : `-${formatINR(Math.abs(property.budgetDelta))}`}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 font-mono-num">
              Rent {formatINR(property.baseRent)} + Maint {formatINR(property.maintenanceCharges)}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Peak Commute & Load</div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400 self-center shrink-0" />
              <span className="font-mono-num text-base font-bold text-slate-900">
                {property.peakCommuteMinutes} min
              </span>
              <span className={`text-[11px] font-semibold ${commuteTextColor}`}>
                · {commuteFrictionLabel}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 font-mono-num">
              {property.monthlyTrafficHours} hrs/mo · {formatINR(property.monthlyCommuteCost)}/mo
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Water & Deposit</div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-slate-400 self-center shrink-0" />
              <span className={`text-sm font-semibold ${waterTextColor}`}>
                {property.waterReliability}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 font-mono-num">
              Deposit {formatINR(property.securityDeposit)}
            </div>
          </div>
        </div>

        {/* Action Strip */}
        <div
          className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSimulate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              Simulate Expenses
            </button>
            <button
              type="button"
              onClick={onViewDetails}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium hover:bg-slate-200/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LineChart className="w-3.5 h-3.5" />
              12M Trends & Specs
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleCompare}
            disabled={!isCompared && !canAddToCompare}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isCompared
                ? "bg-slate-900 text-white border-slate-900"
                : canAddToCompare
                  ? "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  : "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
            }`}
          >
            {isCompared ? <Check className="w-3.5 h-3.5" /> : <GitCompare className="w-3.5 h-3.5" />}
            {isCompared ? "In Compare" : "Compare"}
          </button>
        </div>
      </div>
    </article>
  );
};
