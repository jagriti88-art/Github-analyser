export const compactNumber = (value) =>
  typeof value === "number"
    ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)
    : "-";

export function relativeDays(days) {
  if (days === null || days === undefined) return "unknown";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  const years = (days / 365).toFixed(1).replace(/\.0$/, "");
  return `${years} years ago`;
}

/** Green above 75, amber above 45, red below. */
export function scoreTone(percent) {
  if (percent >= 75) return { text: "text-good", stroke: "stroke-good", bg: "bg-good" };
  if (percent >= 45) return { text: "text-warn", stroke: "stroke-warn", bg: "bg-warn" };
  return { text: "text-bad", stroke: "stroke-bad", bg: "bg-bad" };
}

export const EFFORT_TONE = {
  low: "border-good/30 bg-good/10 text-good",
  medium: "border-warn/30 bg-warn/10 text-warn",
  high: "border-bad/30 bg-bad/10 text-bad",
};
