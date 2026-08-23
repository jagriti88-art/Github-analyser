import test from "node:test";
import assert from "node:assert/strict";
import { badgeForScore, notAnalyzedBadge, renderBadge } from "../src/services/badgeService.js";

test("renders a valid standalone SVG", () => {
  const svg = badgeForScore({ score: 77, grade: "B" });

  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /<\/svg>$/);
  assert.ok(svg.includes("77/100 (B)"));
});

test("grade drives the badge colour", () => {
  const top = badgeForScore({ score: 95, grade: "A+" });
  const bottom = badgeForScore({ score: 20, grade: "E" });

  assert.ok(top.includes("#22c55e"));
  assert.ok(bottom.includes("#ef4444"));
  assert.notEqual(top, bottom);
});

test("width grows with the message", () => {
  const widthOf = (svg) => Number(/width="(\d+)"/.exec(svg)[1]);

  assert.ok(widthOf(renderBadge({ message: "a much longer message here" })) >
    widthOf(renderBadge({ message: "hi" })));
});

test("escapes XML so a crafted label cannot break out", () => {
  const svg = renderBadge({ label: '<script>"x"', message: "ok" });

  assert.ok(!svg.includes("<script>"));
  assert.ok(svg.includes("&lt;script&gt;"));
});

test("unknown repositories still render a badge", () => {
  const svg = notAnalyzedBadge();

  assert.ok(svg.includes("not analysed"));
  assert.match(svg, /<\/svg>$/);
});

test("flat-square style removes the gradient", () => {
  assert.ok(!renderBadge({ message: "x", style: "flat-square" }).includes("linearGradient"));
  assert.ok(renderBadge({ message: "x" }).includes("linearGradient"));
});
