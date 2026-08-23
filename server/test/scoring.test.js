import test from "node:test";
import assert from "node:assert/strict";
import { scoreRepo } from "../src/services/scoring.js";

/** Minimal shape of what githubService returns, so tests stay readable. */
function makeData(overrides = {}) {
  const base = {
    repo: {
      slug: "acme/widget",
      description: null,
      topics: [],
      license: null,
      sizeKb: 100,
      ageDays: 200,
      daysSincePush: 400,
      isFork: false,
      isArchived: false,
    },
    social: {
      stars: 0,
      forks: 0,
      openIssues: 0,
      contributors: 1,
      pullRequests: 0,
      hasIssuesEnabled: true,
      releases: 0,
    },
    languages: [{ name: "JavaScript", bytes: 1000, percent: 100 }],
    commits: {
      sampled: 3,
      authors: 1,
      conventionalRatio: 0,
      lowEffortRatio: 1,
      medianMessageLength: 6,
      spanDays: 2,
      latestCommitAt: null,
    },
    files: {
      fileCount: 4,
      truncated: false,
      rootFiles: ["index.js"],
      rootFileCount: 4,
      topLevelDirs: [],
      testFiles: [],
      testFileCount: 0,
      ciFiles: [],
      lintFiles: [],
      containerFiles: [],
      lockFiles: [],
      manifestFiles: [],
      committedSecrets: [],
      hasSourceDir: false,
      hasGitignore: false,
      hasContributing: false,
      hasChangelog: false,
      hasDocsDir: false,
    },
    readme: { exists: false, bytes: 0, lines: 0, headings: 0, sections: {}, hasBadges: false, hasImages: false },
  };

  return {
    ...base,
    ...overrides,
    repo: { ...base.repo, ...overrides.repo },
    social: { ...base.social, ...overrides.social },
    commits: { ...base.commits, ...overrides.commits },
    files: { ...base.files, ...overrides.files },
    readme: { ...base.readme, ...overrides.readme },
  };
}

test("scores are bounded to 0-100", () => {
  const bare = scoreRepo(makeData());
  assert.ok(bare.score >= 0 && bare.score <= 100, `got ${bare.score}`);
});

test("an empty repo scores low and a well-run repo scores high", () => {
  const bare = scoreRepo(makeData());

  const good = scoreRepo(
    makeData({
      repo: { description: "A widget", topics: ["node", "cli", "widget", "oss"], license: "MIT", daysSincePush: 3 },
      social: { stars: 400, contributors: 12, pullRequests: 40, releases: 6 },
      commits: { sampled: 100, authors: 12, conventionalRatio: 0.8, lowEffortRatio: 0, medianMessageLength: 55, spanDays: 300 },
      files: {
        fileCount: 220,
        rootFileCount: 8,
        testFileCount: 30,
        ciFiles: [".github/workflows/ci.yml"],
        lintFiles: ["eslint.config.js"],
        containerFiles: ["Dockerfile"],
        lockFiles: ["package-lock.json"],
        manifestFiles: ["package.json"],
        hasSourceDir: true,
        hasGitignore: true,
        hasContributing: true,
      },
      readme: {
        exists: true,
        name: "README.md",
        bytes: 6000,
        lines: 200,
        headings: 12,
        sections: { install: true, usage: true, features: true, techStack: true, license: true, contributing: true },
      },
    })
  );

  assert.ok(bare.score < 30, `bare repo scored ${bare.score}`);
  assert.ok(good.score > 85, `good repo scored ${good.score}`);
});

test("scoring is deterministic for identical input", () => {
  assert.equal(scoreRepo(makeData()).score, scoreRepo(makeData()).score);
});

test("committed secrets zero out that check", () => {
  const leaky = scoreRepo(makeData({ files: { committedSecrets: [".env"] } }));
  const secretCheck = leaky.categories
    .find((c) => c.key === "hygiene")
    .checks.find((c) => c.label === "No committed secrets");

  assert.equal(secretCheck.earned, 0);
  assert.equal(secretCheck.status, "fail");
});

test("category weights sum to 100", () => {
  const result = scoreRepo(makeData());
  assert.equal(result.max, 100);
});

test("opportunities are ordered by points left on the table", () => {
  const { opportunities } = scoreRepo(makeData());
  const missing = opportunities.map((o) => o.missing);
  assert.deepEqual(missing, [...missing].sort((a, b) => b - a));
});
