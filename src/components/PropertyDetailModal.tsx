import React, { useState } from "react";
import { X, Calculator, Droplets, Train, Building2, ShoppingBag, ShieldCheck } from "lucide-react";
import type { ComputedProperty } from "../types/rental";
import { formatINR } from "../utils/calculations";
import { SmartMatchGauge } from "./SmartMatchGauge";

interface PropertyDetailModalProps {
  property: ComputedProperty | null;
  hubName: string;
  onClose: () => void;
  onSimulate: (propertyId: string) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  hubName,
  onClose,
  onSimulate,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!property) return null;

  const trends = property.historicalTrends;
  const rents = trends.map((t) => t.avgRent);
  const minR = Math.min(...rents) * 0.96;
  const maxR = Math.max(...rents) * 1.03;

  const chartW = 540;
  const chartH = 160;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 26;

  const points = trends.map((t, idx) => {
    const x = padL + (idx / (trends.length - 1)) * (chartW - padL - padR);
    const y = padT + (1 - (t.avgRent - minR) / (maxR - minR || 1)) * (chartH - padT - padB);
    return { x, y, ...t };
  });

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `M ${points[0].x},${chartH - padB} L ${points
    .map((p) => `${p.x},${p.y}`)
    .join(" L ")} L ${points[points.length - 1].x},${chartH - padB} Z`;

  const yoyChangePct = (((rents[rents.length - 1] - rents[0]) / rents[0]) * 100).toFixed(1);
  const activePoint = hoverIdx !== null ? points[hoverIdx] : points[points.length - 1];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${property.societyName} details`}
    >
      <div
        className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              {property.societyName} · {property.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {property.bhk} · {property.areaSqFt.toLocaleString("en-IN")} sq.ft · {property.locality} ·{" "}
              {Math.round(property.baseRent / property.areaSqFt)} ₹/sq.ft
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SmartMatchGauge score={property.smartMatchScore} size={46} />
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Financial & Commute Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="text-xs text-slate-500">Base Rent</div>
              <div className="font-mono-num text-base font-bold text-slate-900 mt-0.5">
                {formatINR(property.baseRent)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Maintenance</div>
              <div className="font-mono-num text-base font-bold text-slate-900 mt-0.5">
                {formatINR(property.maintenanceCharges)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Security Deposit</div>
              <div className="font-mono-num text-base font-bold text-slate-900 mt-0.5">
                {formatINR(property.securityDeposit)}
              </div>
              <div className="text-[11px] text-slate-400 font-mono-num">
                {(property.securityDeposit / property.baseRent).toFixed(1)}x rent
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">TMCL to {hubName.split(" ")[0]}</div>
              <div className="font-mono-num text-base font-bold text-indigo-600 mt-0.5">
                {formatINR(property.trueMonthlyCost)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono-num">
                {property.peakCommuteMinutes} min peak
              </div>
            </div>
          </div>

          {/* 12-Month Historical Rent Trend Interactive SVG Chart */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  12-Month Society Rent Trajectory
                </h3>
                <p className="text-xs text-slate-500">
                  {activePoint.month}:{" "}
                  <span className="font-mono-num font-semibold text-slate-900">
                    {formatINR(activePoint.avgRent)}
                  </span>{" "}
                  (YoY +{yoyChangePct}%)
                </p>
              </div>
              <span className="text-xs font-mono-num font-semibold text-emerald-700">
                12M Trend +{yoyChangePct}%
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg bg-slate-50/50 p-3">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto block">
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                {[0, 0.5, 1].map((ratio) => {
                  const val = minR + (maxR - minR) * (1 - ratio);
                  const y = padT + ratio * (chartH - padT - padB);
                  return (
                    <g key={ratio}>
                      <line
                        x1={padL}
                        x2={chartW - padR}
                        y1={y}
                        y2={y}
                        stroke="#E2E8F0"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padL - 6}
                        y={y + 3}
                        textAnchor="end"
                        className="fill-slate-400 text-[9px] font-mono-num"
                      >
                        ₹{Math.round(val / 1000)}k
                      </text>
                    </g>
                  );
                })}
                <path d={areaPath} fill="url(#trendGrad)" />
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {points.map((p, idx) => (
                  <g
                    key={p.month}
                    onMouseEnter={() => setHoverIdx(idx)}
                    onMouseLeave={() => setHoverIdx(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={p.x - 16}
                      y={padT}
                      width={32}
                      height={chartH - padT}
                      fill="transparent"
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={hoverIdx === idx ? 5 : 3}
                      fill={hoverIdx === idx ? "#4F46E5" : "#FFFFFF"}
                      stroke="#4F46E5"
                      strokeWidth={2}
                    />
                    {(idx % 2 === 0 || idx === points.length - 1) && (
                      <text
                        x={p.x}
                        y={chartH - 6}
                        textAnchor="middle"
                        className="fill-slate-400 text-[9px]"
                      >
                        {p.month}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Proximity & Water Reliability */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-900 mb-3">
                Proximity & Infrastructure
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <Train className="w-3.5 h-3.5 text-slate-400" /> Nearest Metro
                  </span>
                  <span className="font-mono-num font-semibold text-slate-900">
                    {property.nearbyDistances.metroKm} km
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" /> Multi-Specialty Hospital
                  </span>
                  <span className="font-mono-num font-semibold text-slate-900">
                    {property.nearbyDistances.hospitalKm} km
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-400" /> Supermarket
                  </span>
                  <span className="font-mono-num font-semibold text-slate-900">
                    {property.nearbyDistances.supermarketKm} km
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-slate-400" /> Water Reliability
                  </span>
                  <span className="font-semibold text-slate-900">{property.waterReliability}</span>
                </li>
              </ul>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-900 mb-3">Society Amenities</h4>
              <ul className="grid grid-cols-1 gap-1.5 text-xs text-slate-600">
                {property.amenities.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onSimulate(property.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              Load into TMCL Simulator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
