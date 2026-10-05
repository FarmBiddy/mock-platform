// Called as functions (not components) so Recharts sees plain SVG/Reference elements as direct children.
import { ReferenceLine } from "recharts";

export const compact = (v) => `€${Math.round(v / 1000)}k`;

/** 45° hatch used for projected months: identity stays readable without relying on opacity alone. */
export function hatch(id, color) {
  return (
    <defs key={id}>
      <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill={color} fillOpacity="0.18" />
        <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="2.5" />
      </pattern>
    </defs>
  );
}

/** Vertical "Today" marker at the left edge of the first projected month. */
export function todayLine(x) {
  return (
    x && (
      <ReferenceLine
        key="today"
        x={x}
        position="start"
        stroke="#57534e"
        strokeDasharray="4 3"
        label={{ value: "Today", position: "insideTopRight", fontSize: 11, fill: "#57534e" }}
      />
    )
  );
}
