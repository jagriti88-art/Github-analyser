#!/usr/bin/env node
/**
 * One-command onboarding: copies .env.example files into place (never overwriting an
 * existing .env) and reports what still needs a value.
 */
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  { dir: "server", required: ["GROQ_API_KEY"], recommended: ["GITHUB_TOKEN"] },
  { dir: "client", required: [], recommended: [] },
];

let needsAttention = false;

for (const { dir, required, recommended } of targets) {
  const example = join(root, dir, ".env.example");
  const target = join(root, dir, ".env");

  if (!existsSync(example)) continue;

  if (existsSync(target)) {
    console.log(`  ${dir}/.env already exists, leaving it alone`);
  } else {
    copyFileSync(example, target);
    console.log(`  created ${dir}/.env from .env.example`);
  }

  const contents = readFileSync(target, "utf8");
  const valueOf = (key) => new RegExp(`^${key}=(.*)$`, "m").exec(contents)?.[1]?.trim();

  for (const key of required) {
    if (!valueOf(key)) {
      needsAttention = true;
      console.log(`    ! ${dir}/.env is missing ${key} - the AI review will be skipped without it`);
    }
  }
  for (const key of recommended) {
    if (!valueOf(key)) {
      console.log(`    - ${dir}/.env has no ${key} - GitHub will rate limit you to 60 requests/hour`);
    }
  }
}

console.log(
  needsAttention
    ? "\nFill in the values above, then run: npm run dev"
    : "\nReady. Run: npm run dev"
);
