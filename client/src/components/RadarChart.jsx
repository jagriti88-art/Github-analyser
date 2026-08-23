import { motion } from "framer-motion";

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 88;
const RINGS = [0.25, 0.5, 0.75, 1];

/** Shorter labels so the axis text fits around the chart. */
const SHORT_LABEL = {
  documentation: "Docs",
  quality: "Tests",
  activity: "Activity",
  structure: "Structure",
  community: "Community",
  hygiene: "Hygiene",
};

const pointAt = (index, count, ratio) => {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return [CENTER + Math.cos(angle) * RADIUS * ratio, CENTER + Math.sin(angle) * RADIUS * ratio];
};

const toPath = (values) =>
  values.map((ratio, index) => pointAt(index, values.length, ratio).join(",")).join(" ");

/**
 * Compares one or two repositories across the six rubric categories.
 * `series` is [{ name, color, values: number[] }] with values as percentages.
 */
export default function RadarChart({ categories, series }) {
  const count = categories.length;

  return (
    <figure className="flex flex-col items-center">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[280px]" role="img"
        aria-label={`Rubric radar across ${categories.map((c) => c.title).join(", ")}`}>
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={toPath(Array.from({ length: count }, () => ring))}
            className="fill-none stroke-white/10"
            strokeWidth="1"
          />
        ))}

        {categories.map((category, index) => {
          const [x, y] = pointAt(index, count, 1);
          return <line key={category.key} x1={CENTER} y1={CENTER} x2={x} y2={y} className="stroke-white/10" />;
        })}

        {series.map((entry) => (
          <motion.polygon
            key={entry.name}
            points={toPath(entry.values.map((value) => value / 100))}
            fill={entry.color}
            fillOpacity="0.18"
            stroke={entry.color}
            strokeWidth="2"
            strokeLinejoin="round"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          />
        ))}

        {categories.map((category, index) => {
          const [x, y] = pointAt(index, count, 1.28);
          return (
            <text
              key={category.key}
              x={x}
              y={y}
              textAnchor={x < CENTER - 5 ? "end" : x > CENTER + 5 ? "start" : "middle"}
              dominantBaseline="middle"
              className="fill-ink-300 text-[10px]"
            >
              {SHORT_LABEL[category.key] ?? category.title}
            </text>
          );
        })}
      </svg>

      {series.length > 1 ? (
        <figcaption className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-ink-300">
          {series.map((entry) => (
            <span key={entry.name} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}
