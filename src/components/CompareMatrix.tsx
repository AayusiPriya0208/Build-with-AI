import React from "react";
import { Calculator, X } from "lucide-react";
import type { ComputedProperty, OfficeHub } from "../types/rental";
import { formatINR } from "../utils/calculations";
import { SmartMatchGauge } from "./SmartMatchGauge";

interface CompareMatrixProps {
  allProperties: ComputedProperty[];
  compareIds: string[];
  onUpdateCompareIds: (ids: string[]) => void;
  selectedHub: OfficeHub;
  onSimulate: (propertyId: string) => void;
}

export const CompareMatrix: React.FC<CompareMatrixProps> = ({
  allProperties,
  compareIds,
  onUpdateCompareIds,
  selectedHub,
  onSimulate,
}) => {
  // Default to top 3 SmartMatch properties if user has fewer than 2 selected
  const activeIds =
    compareIds.length >= 2
      ? compareIds.slice(0, 3)
      : allProperties.slice(0, 3).map((p) => p.id);

  const selectedProps = activeIds
    .map((id) => allProperties.find((p) => p.id === id))
    .filter((p): p is ComputedProperty => Boolean(p));

  if (selectedProps.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
        <p className="text-sm text-slate-600">Select properties from Discover to compare them side-by-side.</p>
      </div>
    );
  }

  const lowestTmcl = Math.min(...selectedProps.map((p) => p.trueMonthlyCost));
  const lowestCommute = Math.min(...selectedProps.map((p) => p.peakCommuteMinutes));
  const lowestDeposit = Math.min(...selectedProps.map((p) => p.securityDeposit));
  const highestMatch = Math.max(...selectedProps.map((p) => p.smartMatchScore));

  const handleSwap = (slotIdx: number, newId: string) => {
    const next = [...activeIds];
    next[slotIdx] = newId;
    onUpdateCompareIds(Array.from(new Set(next)));
  };

  const handleRemove = (id: string) => {
    const next = activeIds.filter((x) => x !== id);
    onUpdateCompareIds(next);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Side-by-Side Trade-Off Matrix
          </h2>
          <p className="text-xs text-slate-500">
            Comparing live TMCL, peak commute to {selectedHub.shortName}, and water risk
          </p>
        </div>
        {compareIds.length < 3 && (
          <span className="text-xs text-slate-500">
            Swap any column below or toggle Compare on Discover cards
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[680px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              <th className="py-4 px-5 w-48 text-xs font-semibold text-slate-500 uppercase tracking-wider align-top">
                Comparison Metric
              </th>
              {selectedProps.map((prop, idx) => (
                <th key={prop.id} className="py-4 px-5 align-top border-l border-slate-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <select
                        aria-label={`Select property for column ${idx + 1}`}
                        value={prop.id}
                        onChange={(e) => handleSwap(idx, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      >
                        {allProperties.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.societyName} ({opt.bhk} · {opt.locality})
                          </option>
                        ))}
                      </select>
                      <div className="mt-1.5 text-xs font-normal text-slate-500">
                        {prop.name} · {prop.areaSqFt.toLocaleString("en-IN")} sq.ft
                      </div>
                    </div>
                    {selectedProps.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemove(prop.id)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                        aria-label={`Remove ${prop.societyName}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            <tr className="bg-white">
              <td className="py-3.5 px-5 font-semibold text-slate-700">SmartMatch Score</td>
              {selectedProps.map((prop) => (
                <td key={prop.id} className="py-3.5 px-5 border-l border-slate-100">
                  <div className="flex items-center gap-3">
                    <SmartMatchGauge score={prop.smartMatchScore} size={44} />
                    {prop.smartMatchScore === highestMatch && (
                      <span className="text-[11px] font-semibold text-emerald-700">
                        Top Recommended
                      </span>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50/50">
              <td className="py-3.5 px-5 font-semibold text-slate-700">True Monthly Cost (TMCL)</td>
              {selectedProps.map((prop) => {
                const diff = prop.trueMonthlyCost - lowestTmcl;
                return (
                  <td key={prop.id} className="py-3.5 px-5 border-l border-slate-100 font-mono-num">
                    <div className="text-sm font-bold text-slate-900">
                      {formatINR(prop.trueMonthlyCost)}
                    </div>
                    <div
                      className={`text-[11px] font-semibold mt-0.5 ${
                        diff === 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {diff === 0 ? "Lowest Total Monthly Cost" : `+${formatINR(diff)}/mo vs best`}
                    </div>
                  </td>
                );
              })}
            </tr>

            <tr className="bg-white">
              <td className="py-3.5 px-5 font-semibold text-slate-700">Base Rent + Maintenance</td>
              {selectedProps.map((prop) => (
                <td key={prop.id} className="py-3.5 px-5 border-l border-slate-100 font-mono-num">
                  <div className="font-semibold text-slate-900">{formatINR(prop.baseRent)}</div>
                  <div className="text-[11px] text-slate-500">
                    + {formatINR(prop.maintenanceCharges)} maint
                  </div>
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50/50">
              <td className="py-3.5 px-5 font-semibold text-slate-700">Peak Commute & Monthly Hours</td>
              {selectedProps.map((prop) => {
                const minDiff = prop.peakCommuteMinutes - lowestCommute;
                const hrsSaved =
                  Math.round((((prop.peakCommuteMinutes - lowestCommute) * 2 * 22) / 60) * 10) /
                  10;
                return (
                  <td key={prop.id} className="py-3.5 px-5 border-l border-slate-100 font-mono-num">
                    <div className="font-semibold text-slate-900">
                      {prop.peakCommuteMinutes} min · {prop.monthlyTrafficHours} hrs/mo
                    </div>
                    <div
                      className={`text-[11px] font-medium mt-0.5 ${
                        minDiff === 0 ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      {minDiff === 0
                        ? `Fastest route (${formatINR(prop.monthlyCommuteCost)}/mo)`
                        : `+${hrsSaved} hrs/mo in traffic (${formatINR(prop.monthlyCommuteCost)}/mo)`}
                    </div>
                  </td>
                );
              })}
            </tr>

            <tr className="bg-white">
              <td className="py-3.5 px-5 font-semibold text-slate-700">Security Deposit</td>
              {selectedProps.map((prop) => {
                const diff = prop.securityDeposit - lowestDeposit;
                return (
                  <td key={prop.id} className="py-3.5 px-5 border-l border-slate-100 font-mono-num">
                    <div className="font-semibold text-slate-900">
                      {formatINR(prop.securityDeposit)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {diff === 0 ? "Lowest upfront lock-in" : `+${formatINR(diff)} upfront`}
                    </div>
                  </td>
                );
              })}
            </tr>

            <tr className="bg-slate-50/50">
              <td className="py-3.5 px-5 font-semibold text-slate-700">Water Reliability</td>
              {selectedProps.map((prop) => (
                <td key={prop.id} className="py-3.5 px-5 border-l border-slate-100">
                  <span
                    className={`font-semibold ${
                      prop.waterReliability === "High"
                        ? "text-emerald-700"
                        : prop.waterReliability === "Moderate"
                          ? "text-amber-700"
                          : "text-rose-700"
                    }`}
                  >
                    {prop.waterReliability}
                  </span>
                  <div className="text-[11px] text-slate-500 font-mono-num">
                    {prop.tankerSurchargeEst === 0
                      ? "₹0 tanker buffer"
                      : `+${formatINR(prop.tankerSurchargeEst)}/mo tanker est.`}
                  </div>
                </td>
              ))}
            </tr>

            <tr className="bg-white">
              <td className="py-3.5 px-5 font-semibold text-slate-700">Metro & Hospital Access</td>
              {selectedProps.map((prop) => (
                <td key={prop.id} className="py-3.5 px-5 border-l border-slate-100 font-mono-num text-slate-700">
                  <div>{prop.nearbyDistances.metroKm} km to Metro</div>
                  <div className="text-[11px] text-slate-500">
                    {prop.nearbyDistances.hospitalKm} km Hospital · {prop.nearbyDistances.supermarketKm} km Mart
                  </div>
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50/40">
              <td className="py-3.5 px-5 font-semibold text-slate-700">Action</td>
              {selectedProps.map((prop) => (
                <td key={prop.id} className="py-3.5 px-5 border-l border-slate-100">
                  <button
                    type="button"
                    onClick={() => onSimulate(prop.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer whitespace-nowrap"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    Simulate Expenses
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
