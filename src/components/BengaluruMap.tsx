import React, { useMemo, useState } from "react";
import type { ComputedProperty, OfficeHub } from "../types/rental";
import { formatINR } from "../utils/calculations";

interface BengaluruMapProps {
  properties: ComputedProperty[];
  selectedHub: OfficeHub;
  selectedPropertyId: string | null;
  onSelectProperty: (id: string) => void;
}

// Bounding box tuned to cover E-City South (12.825) to Hebbal North (13.065),
// and Hebbal/CBD West (77.595) to Whitefield East (77.775)
const LAT_MIN = 12.82;
const LAT_MAX = 13.065;
const LNG_MIN = 77.60;
const LNG_MAX = 77.775;

const SVG_W = 680;
const SVG_H = 380;
const PAD = 38;

function project(lat: number, lng: number): { x: number; y: number } {
  const x = PAD + ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * (SVG_W - PAD * 2);
  const y = PAD + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (SVG_H - PAD * 2);
  return { x, y };
}

const LOCALITY_LABELS: Array<{ name: string; lat: number; lng: number }> = [
  { name: "Whitefield", lat: 12.999, lng: 77.742 },
  { name: "Marathahalli", lat: 12.958, lng: 77.704 },
  { name: "Bellandur", lat: 12.926, lng: 77.673 },
  { name: "Sarjapur Rd", lat: 12.900, lng: 77.684 },
  { name: "Electronic City", lat: 12.834, lng: 77.662 },
];

export const BengaluruMap: React.FC<BengaluruMapProps> = ({
  properties,
  selectedHub,
  selectedPropertyId,
  onSelectProperty,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const hubPos = useMemo(
    () => project(selectedHub.coordinates.lat, selectedHub.coordinates.lng),
    [selectedHub]
  );

  // Corridor polyline waypoints for geographic realism
  const orrPath = useMemo(() => {
    const pts = [
      project(13.045, 77.620), // Hebbal/Manyata
      project(12.995, 77.665), // KR Puram / CV Raman
      project(12.955, 77.701), // Marathahalli Bridge
      project(12.928, 77.688), // Ecospace / Bellandur
      project(12.916, 77.624), // Silk Board
    ];
    return `M ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`;
  }, []);

  const purpleMetroPath = useMemo(() => {
    const pts = [
      project(12.981, 77.638), // Indiranagar
      project(12.989, 77.662), // Baiyappanahalli
      project(12.995, 77.702), // Hoodi
      project(12.985, 77.736), // ITPL
      project(12.971, 77.752), // Whitefield Kadugodi
    ];
    return `M ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`;
  }, []);

  const yellowMetroPath = useMemo(() => {
    const pts = [
      project(12.917, 77.622), // Silk Board
      project(12.885, 77.641), // Bommanahalli
      project(12.851, 77.663), // Infosys / Konappana
      project(12.838, 77.674), // Bommasandra edge
    ];
    return `M ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`;
  }, []);

  const activeId = hoveredId ?? selectedPropertyId ?? properties[0]?.id ?? null;
  const activeProp = properties.find((p) => p.id === activeId) ?? null;
  const activePos = activeProp
    ? project(activeProp.coordinates.lat, activeProp.coordinates.lng)
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/70">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Tech Corridor Spatial Matrix
          </h3>
          <p className="text-xs text-slate-500">
            Click any property pin to inspect commute vector to {selectedHub.shortName}
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Match 85+
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
            Match 70–84
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Under 70
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-slate-900">
            <span className="w-2.5 h-2.5 rotate-45 bg-slate-900 inline-block" />
            Office Hub
          </span>
        </div>
      </div>

      <div className="relative bg-slate-50">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-auto block select-none"
          role="img"
          aria-label="Bengaluru rental properties and office hub commute map"
        >
          {/* Subtle coordinate grid */}
          <defs>
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="0.7"
                strokeOpacity="0.65"
              />
            </pattern>
          </defs>
          <rect width={SVG_W} height={SVG_H} fill="url(#mapGrid)" />

          {/* Bellandur Lake subtle polygon */}
          <ellipse
            cx={project(12.936, 77.665).x}
            cy={project(12.936, 77.665).y}
            rx={26}
            ry={14}
            fill="#DBEAFE"
            stroke="#93C5FD"
            strokeWidth="1"
            opacity="0.75"
          />
          <text
            x={project(12.936, 77.665).x}
            y={project(12.936, 77.665).y + 3}
            textAnchor="middle"
            className="fill-sky-700 text-[8px] font-medium"
          >
            Bellandur Lake
          </text>

          {/* Major Road & Metro Corridors */}
          <path d={orrPath} fill="none" stroke="#CBD5E1" strokeWidth="6" strokeLinecap="round" />
          <path
            d={orrPath}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />

          <path
            d={purpleMetroPath}
            fill="none"
            stroke="#7C3AED"
            strokeWidth="2.5"
            strokeOpacity="0.55"
            strokeLinecap="round"
          />
          <path
            d={yellowMetroPath}
            fill="none"
            stroke="#D97706"
            strokeWidth="2.5"
            strokeOpacity="0.55"
            strokeLinecap="round"
          />

          {/* Locality Labels */}
          {LOCALITY_LABELS.map((loc) => {
            const p = project(loc.lat, loc.lng);
            return (
              <text
                key={loc.name}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] font-semibold tracking-wider uppercase pointer-events-none"
              >
                {loc.name}
              </text>
            );
          })}

          {/* Commute arc for active/hovered property */}
          {activeProp && activePos && (
            <path
              d={`M ${activePos.x} ${activePos.y} Q ${(activePos.x + hubPos.x) / 2} ${
                Math.min(activePos.y, hubPos.y) - 24
              } ${hubPos.x} ${hubPos.y}`}
              fill="none"
              stroke="#4F46E5"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          )}

          {/* Property Pins */}
          {properties.map((prop) => {
            const { x, y } = project(prop.coordinates.lat, prop.coordinates.lng);
            const isActive = prop.id === activeId;
            const fill =
              prop.smartMatchScore >= 85
                ? "#10B981"
                : prop.smartMatchScore >= 70
                  ? "#4F46E5"
                  : "#F59E0B";

            return (
              <g
                key={prop.id}
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelectProperty(prop.id)}
                onMouseEnter={() => setHoveredId(prop.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="cursor-pointer"
              >
                {isActive && (
                  <circle r={13} fill={fill} fillOpacity={0.18} stroke={fill} strokeWidth={1.5} />
                )}
                <circle
                  r={isActive ? 7.5 : 6}
                  fill={fill}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
                {isActive && (
                  <text
                    y={-12}
                    textAnchor="middle"
                    className="fill-slate-900 text-[10px] font-semibold"
                  >
                    {prop.societyName.split(" ")[0]} · {prop.smartMatchScore}%
                  </text>
                )}
              </g>
            );
          })}

          {/* Target Office Hub Marker */}
          <g transform={`translate(${hubPos.x}, ${hubPos.y})`}>
            <rect
              x={-7}
              y={-7}
              width={14}
              height={14}
              rx={2}
              transform="rotate(45)"
              fill="#0F172A"
              stroke="#FFFFFF"
              strokeWidth={2}
            />
            <text
              y={21}
              textAnchor="middle"
              className="fill-slate-900 text-[10px] font-bold"
            >
              {selectedHub.shortName}
            </text>
          </g>
        </svg>

        {/* Bottom Map Readout Bar for Selected/Hovered Property */}
        {activeProp && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border-t border-slate-200 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-slate-900 truncate">
                {activeProp.societyName} ({activeProp.bhk})
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600 truncate">{activeProp.locality}</span>
            </div>
            <div className="flex items-center gap-4 font-mono-num shrink-0">
              <span className="text-slate-700">
                TMCL <strong className="text-slate-900">{formatINR(activeProp.trueMonthlyCost)}</strong>
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-700">
                {activeProp.peakCommuteMinutes} min ({activeProp.roadDistanceKm} km)
              </span>
              <span className="text-slate-400">|</span>
              <span
                className={
                  activeProp.smartMatchScore >= 85
                    ? "text-emerald-700 font-semibold"
                    : activeProp.smartMatchScore >= 70
                      ? "text-indigo-700 font-semibold"
                      : "text-amber-700 font-semibold"
                }
              >
                {activeProp.smartMatchScore}% Match
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
