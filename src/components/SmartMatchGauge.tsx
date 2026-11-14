import React from "react";

interface SmartMatchGaugeProps {
  score: number;
  size?: number;
}

export const SmartMatchGauge: React.FC<SmartMatchGaugeProps> = ({ score, size = 54 }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const strokeColor =
    clamped >= 85 ? "#10B981" : clamped >= 70 ? "#4F46E5" : clamped >= 55 ? "#F59E0B" : "#EF4444";

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      aria-label={`SmartMatch score ${clamped} percent`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 220ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-mono-num text-sm font-bold text-slate-900">
          {clamped}
          <span className="text-[10px] font-medium text-slate-500">%</span>
        </span>
      </div>
    </div>
  );
};
