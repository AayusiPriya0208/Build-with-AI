import React, { useMemo, useState } from "react";
import { ALL_LOCALITIES } from "../data/bengaluruData";
import type { BhkType, ComputedProperty, LocalityName, OfficeHub } from "../types/rental";
import { formatINR } from "../utils/calculations";

interface MarketAnalyticsProps {
  allProperties: ComputedProperty[];
  selectedHub: OfficeHub;
}

const LOCALITY_COLORS: Record<LocalityName, string> = {
  Whitefield: "#4F46E5",
  "Sarjapur Road": "#0F172A",
  Bellandur: "#10B981",
  Marathahalli: "#F59E0B",
  "Electronic City": "#3B82F6",
};

export const MarketAnalytics: React.FC<MarketAnalyticsProps> = ({
  allProperties,
  selectedHub,
}) => {
  const [hoveredLocality, setHoveredLocality] = useState<LocalityName | null>(null);
  const [trendBhk, setTrendBhk] = useState<"All" | BhkType>("2BHK");
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);

  // Locality Aggregate Stats
  const localityStats = useMemo(() => {
    return ALL_LOCALITIES.map((loc) => {
      const items = allProperties.filter((p) => p.locality === loc);
      const count = items.length || 1;
      const avgBaseRent = Math.round(items.reduce((a, b) => a + b.baseRent, 0) / count);
      const avgTmcl = Math.round(items.reduce((a, b) => a + b.trueMonthlyCost, 0) / count);
      const avgCommuteMin = Math.round(
        items.reduce((a, b) => a + b.peakCommuteMinutes, 0) / count
      );
      const avgTrafficHrs =
        Math.round((items.reduce((a, b) => a + b.monthlyTrafficHours, 0) / count) * 10) / 10;
      const avgPricePerSqFt = Math.round(
        items.reduce((a, b) => a + b.baseRent / b.areaSqFt, 0) / count
      );
      const avgDepositRatio =
        Math.round(
          (items.reduce((a, b) => a + b.securityDeposit / b.baseRent, 0) / count) * 10
        ) / 10;
      const highWaterPct = Math.round(
        (items.filter((p) => p.waterReliability === "High").length / count) * 100
      );

      return {
        locality: loc,
        avgBaseRent,
        avgTmcl,
        avgCommuteMin,
        avgTrafficHrs,
        avgPricePerSqFt,
        avgDepositRatio,
        highWaterPct,
      };
    });
  }, [allProperties]);

  // 12-Month Trend Series per Locality
  const trendData = useMemo(() => {
    const months = allProperties[0]?.historicalTrends.map((t) => t.month) ?? [];
    const series = ALL_LOCALITIES.map((loc) => {
      const matching = allProperties.filter(
        (p) => p.locality === loc && (trendBhk === "All" || p.bhk === trendBhk)
      );
      const values = months.map((m, idx) => {
        if (matching.length === 0) return 0;
        const sum = matching.reduce(
          (acc, prop) => acc + (prop.historicalTrends[idx]?.avgRent ?? prop.baseRent),
          0
        );
        return Math.round(sum / matching.length);
      });
      return {
        locality: loc,
        color: LOCALITY_COLORS[loc],
        values,
      };
    });
    return { months, series };
  }, [allProperties, trendBhk]);

  // Bar Chart Geometry
  const barW = 560;
  const barH = 260;
  const maxBarVal = Math.max(...localityStats.map((s) => s.avgTmcl), 55000) * 1.12;

  // Line Chart Geometry
  const lineW = 560;
  const lineH = 260;
  const lPadL = 54;
  const lPadR = 18;
  const lPadT = 20;
  const lPadB = 30;
  const allVals = trendData.series.flatMap((s) => s.values).filter((v) => v > 0);
  const minLine = (allVals.length ? Math.min(...allVals) : 15000) * 0.92;
  const maxLine = (allVals.length ? Math.max(...allVals) : 55000) * 1.05;

  const activeMonthIndex =
    hoveredMonthIdx !== null ? hoveredMonthIdx : trendData.months.length - 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Locality Comparison Grouped Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Locality Base Rent vs. TMCL
              </h2>
              <p className="text-xs text-slate-500">
                Averaged across BHK tiers commuting to {selectedHub.shortName}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-900 inline-block" />
                Avg Base Rent
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block" />
                Avg TMCL
              </span>
            </div>
          </div>

          <svg viewBox={`0 0 ${barW} ${barH}`} className="w-full h-auto block">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = 16 + ratio * (barH - 54);
              const val = maxBarVal * (1 - ratio);
              return (
                <g key={ratio}>
                  <line
                    x1={52}
                    x2={barW - 14}
                    y1={y}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={46}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px] font-mono-num"
                  >
                    ₹{Math.round(val / 1000)}k
                  </text>
                </g>
              );
            })}

            {localityStats.map((stat, idx) => {
              const groupW = (barW - 74) / localityStats.length;
              const cx = 56 + idx * groupW + groupW / 2;
              const chartBottom = barH - 38;
              const availH = chartBottom - 16;
              const baseH = (stat.avgBaseRent / maxBarVal) * availH;
              const tmclH = (stat.avgTmcl / maxBarVal) * availH;
              const isHov = hoveredLocality === stat.locality;

              return (
                <g
                  key={stat.locality}
                  onMouseEnter={() => setHoveredLocality(stat.locality)}
                  onMouseLeave={() => setHoveredLocality(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={cx - groupW / 2 + 4}
                    y={12}
                    width={groupW - 8}
                    height={chartBottom - 8}
                    rx={6}
                    fill={isHov ? "#F1F5F9" : "transparent"}
                  />
                  <rect
                    x={cx - 19}
                    y={chartBottom - baseH}
                    width={16}
                    height={baseH}
                    rx={3}
                    fill="#0F172A"
                  />
                  <rect
                    x={cx + 3}
                    y={chartBottom - tmclH}
                    width={16}
                    height={tmclH}
                    rx={3}
                    fill="#4F46E5"
                  />
                  <text
                    x={cx}
                    y={barH - 20}
                    textAnchor="middle"
                    className="fill-slate-700 text-[10px] font-semibold"
                  >
                    {stat.locality === "Electronic City"
                      ? "E-City"
                      : stat.locality === "Sarjapur Road"
                        ? "Sarjapur"
                        : stat.locality}
                  </text>
                  <text
                    x={cx}
                    y={barH - 7}
                    textAnchor="middle"
                    className="fill-slate-400 text-[9px] font-mono-num"
                  >
                    {stat.avgCommuteMin}m peak
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Hover Callout Bar */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            {(() => {
              const target =
                localityStats.find((s) => s.locality === hoveredLocality) ?? localityStats[0];
              const hiddenOverhead = target.avgTmcl - target.avgBaseRent;
              return (
                <>
                  <span className="font-semibold text-slate-900">{target.locality}</span>
                  <div className="flex items-center gap-4 font-mono-num text-slate-600">
                    <span>Base {formatINR(target.avgBaseRent)}</span>
                    <span>TMCL {formatINR(target.avgTmcl)}</span>
                    <span className="text-amber-700 font-semibold">
                      +{formatINR(hiddenOverhead)} commute/maint overhead
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Chart 2: 12-Month Rental Price Trends Interactive Multi-Line Chart */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                12-Month Rental Price Trajectory
              </h2>
              <p className="text-xs text-slate-500">
                Hover chart months to compare average asking rent ({trendBhk})
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(["1BHK", "2BHK", "3BHK"] as BhkType[]).map((bhk) => (
                <button
                  key={bhk}
                  type="button"
                  onClick={() => setTrendBhk(bhk)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    trendBhk === bhk
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {bhk}
                </button>
              ))}
            </div>
          </div>

          <svg viewBox={`0 0 ${lineW} ${lineH}`} className="w-full h-auto block">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = lPadT + ratio * (lineH - lPadT - lPadB);
              const val = maxLine - ratio * (maxLine - minLine);
              return (
                <g key={ratio}>
                  <line
                    x1={lPadL}
                    x2={lineW - lPadR}
                    y1={y}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={lPadL - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px] font-mono-num"
                  >
                    ₹{Math.round(val / 1000)}k
                  </text>
                </g>
              );
            })}

            {/* Active vertical crosshair */}
            {trendData.months.length > 1 && (
              <line
                x1={
                  lPadL +
                  (activeMonthIndex / (trendData.months.length - 1)) * (lineW - lPadL - lPadR)
                }
                x2={
                  lPadL +
                  (activeMonthIndex / (trendData.months.length - 1)) * (lineW - lPadL - lPadR)
                }
                y1={lPadT}
                y2={lineH - lPadB}
                stroke="#CBD5E1"
                strokeWidth={1.5}
              />
            )}

            {/* Locality Polylines */}
            {trendData.series.map((s) => {
              const pts = s.values.map((val, idx) => {
                const x =
                  lPadL + (idx / Math.max(1, s.values.length - 1)) * (lineW - lPadL - lPadR);
                const y =
                  lPadT + (1 - (val - minLine) / (maxLine - minLine || 1)) * (lineH - lPadT - lPadB);
                return { x, y, val };
              });
              const d = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
              const activePt = pts[activeMonthIndex];

              return (
                <g key={s.locality}>
                  <polyline
                    points={d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {activePt && (
                    <circle
                      cx={activePt.x}
                      cy={activePt.y}
                      r={4}
                      fill={s.color}
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />
                  )}
                </g>
              );
            })}

            {/* Invisible hover columns for each month */}
            {trendData.months.map((m, idx) => {
              const x =
                lPadL + (idx / Math.max(1, trendData.months.length - 1)) * (lineW - lPadL - lPadR);
              return (
                <g
                  key={m}
                  onMouseEnter={() => setHoveredMonthIdx(idx)}
                  onMouseLeave={() => setHoveredMonthIdx(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={x - 18}
                    y={lPadT}
                    width={36}
                    height={lineH - lPadT}
                    fill="transparent"
                  />
                  {(idx % 2 === 0 || idx === trendData.months.length - 1) && (
                    <text
                      x={x}
                      y={lineH - 8}
                      textAnchor="middle"
                      className="fill-slate-400 text-[9px]"
                    >
                      {m}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Month Crosshair Legend */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-900">
              {trendData.months[activeMonthIndex]} ({trendBhk}):
            </span>
            <div className="flex flex-wrap items-center gap-3 font-mono-num">
              {trendData.series.map((s) => (
                <span key={s.locality} className="inline-flex items-center gap-1.5 text-slate-700">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.locality === "Electronic City"
                    ? "E-City"
                    : s.locality === "Sarjapur Road"
                      ? "Sarjapur"
                      : s.locality}
                  : <strong className="text-slate-900">{formatINR(s.values[activeMonthIndex])}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* High-Density Locality Benchmark Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900">
              Bengaluru Micro-Market Benchmark Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Aggregated cost-per-sq.ft, deposit multiples, and Cauvery water reliability
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4">Locality</th>
                <th className="py-2.5 px-4 text-right">Avg Base Rent</th>
                <th className="py-2.5 px-4 text-right">Avg TMCL</th>
                <th className="py-2.5 px-4 text-right">Rate / Sq.Ft</th>
                <th className="py-2.5 px-4 text-right">Peak Commute</th>
                <th className="py-2.5 px-4 text-right">Traffic / Mo</th>
                <th className="py-2.5 px-4 text-right">Deposit Ratio</th>
                <th className="py-2.5 px-4 text-right">High Water Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {localityStats.map((row) => (
                <tr key={row.locality} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{row.locality}</td>
                  <td className="py-3 px-4 text-right font-mono-num text-slate-700">
                    {formatINR(row.avgBaseRent)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-num font-bold text-indigo-700">
                    {formatINR(row.avgTmcl)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-num text-slate-700">
                    ₹{row.avgPricePerSqFt}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-num text-slate-700">
                    {row.avgCommuteMin} min
                  </td>
                  <td className="py-3 px-4 text-right font-mono-num text-slate-700">
                    {row.avgTrafficHrs} hrs
                  </td>
                  <td className="py-3 px-4 text-right font-mono-num text-slate-700">
                    {row.avgDepositRatio}x
                  </td>
                  <td className="py-3 px-4 text-right font-mono-num">
                    <span
                      className={
                        row.highWaterPct >= 60
                          ? "text-emerald-700 font-semibold"
                          : row.highWaterPct >= 30
                            ? "text-amber-700 font-semibold"
                            : "text-rose-700 font-semibold"
                      }
                    >
                      {row.highWaterPct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
