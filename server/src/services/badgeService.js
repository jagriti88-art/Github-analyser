/**
 * Renders a shields.io-style SVG badge so a graded repository can embed its own score
 * in its README. Self-contained: no network call, no dependency.
 */

const COLORS = {
  "A+": "#22c55e",
  A: "#4ade80",
  B: "#84cc16",
  C: "#eab308",
  D: "#f97316",
  E: "#ef4444",
  unknown: "#94a3b8",
};

// Approximate Verdana advance width at 11px, good enough for badge layout.
const charWidth = (char) => (/[A-Z0-9@#%&]/.test(char) ? 7.4 : /[ijltfr.,:'!|]/.test(char) ? 3.4 : 6.3);
const textWidth = (text) => [...text].reduce((total, char) => total + charWidth(char), 0);

const escapeXml = (value) =>
  String(value).replace(/[<>&'"]/g, (char) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char]
  );

export function renderBadge({ label = "gitgrade", message, color = COLORS.unknown, style = "flat" }) {
  const padding = 10;
  const labelWidth = Math.round(textWidth(label) + padding * 2);
  const messageWidth = Math.round(textWidth(message) + padding * 2);
  const width = labelWidth + messageWidth;
  const height = style === "flat-square" ? 20 : 20;
  const radius = style === "flat-square" ? 0 : 3;

  const gradient =
    style === "flat-square"
      ? ""
      : `<linearGradient id="s" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>`;

  const shine =
    style === "flat-square"
      ? ""
      : `<rect width="${width}" height="${height}" rx="${radius}" fill="url(#s)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="${escapeXml(label)}: ${escapeXml(message)}">
  <title>${escapeXml(label)}: ${escapeXml(message)}</title>
  <defs>${gradient}</defs>
  <clipPath id="r"><rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="#555"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="${height}" fill="${color}"/>
    ${shine}
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${labelWidth / 2}" y="14">${escapeXml(label)}</text>
    <text x="${labelWidth + messageWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(message)}</text>
    <text x="${labelWidth + messageWidth / 2}" y="14">${escapeXml(message)}</text>
  </g>
</svg>`;
}

export const badgeForScore = ({ score, grade }, options = {}) =>
  renderBadge({
    message: `${score}/100 (${grade})`,
    color: COLORS[grade] ?? COLORS.unknown,
    ...options,
  });

export const notAnalyzedBadge = (options = {}) =>
  renderBadge({ message: "not analysed", color: COLORS.unknown, ...options });
