import React from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import type { AITradeoffExplanation, ComputedProperty } from "../types/rental";
import { formatINR } from "../utils/calculations";

interface TradeOffInsightsPanelProps {
  topProperties: ComputedProperty[];
  explanations: AITradeoffExplanation[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSelectProperty: (id: string) => void;
}

export const TradeOffInsightsPanel: React.FC<TradeOffInsightsPanelProps> = ({
  topProperties,
  explanations,
  isLoading,
  error,
  onRefresh,
  onSelectProperty,
}) => {
  return (
    <section
      className="bg-white border border-slate-200 rounded-lg p-5"
      aria-label="Top 3 SmartMatch Trade-Off Insights"
    >
      <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900">
              Namma Intel Trade-Off Analysis (Top 3 Matches)
            </h3>
            <p className="text-xs text-slate-500">
              Gemini 2.5 Flash synthesis comparing TMCL, commute savings & water reliability
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Analyzing..." : "Refresh AI"}
        </button>
      </div>

      {error && (
        <div className="mt-3 px-3.5 py-2.5 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900">
          {error}
        </div>
      )}

      <div className="mt-4 divide-y divide-slate-100">
        {topProperties.slice(0, 3).map((prop, index) => {
          const match = explanations.find((e) => e.propertyId === prop.id);
          return (
            <div
              key={prop.id}
              onClick={() => onSelectProperty(prop.id)}
              className="py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-slate-50/70 rounded px-2 -mx-2 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">
                  0{index + 1}. {prop.societyName} · {prop.locality}
                </span>
                <span className="font-mono-num text-xs font-semibold text-indigo-600 shrink-0">
                  {prop.smartMatchScore}% Match · {formatINR(prop.trueMonthlyCost)}/mo
                </span>
              </div>

              {isLoading ? (
                <div className="mt-2 space-y-1.5">
                  <div className="h-3 bg-slate-100 rounded w-full animate-pulse" />
                  <div className="h-3 bg-slate-100 rounded w-4/5 animate-pulse" />
                </div>
              ) : (
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {match?.explanation ??
                    `${prop.societyName} delivers a ${prop.peakCommuteMinutes}-min peak commute (${prop.monthlyTrafficHours} hrs/mo) and ${prop.waterReliability} water reliability at a total TMCL of ${formatINR(prop.trueMonthlyCost)}.`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
