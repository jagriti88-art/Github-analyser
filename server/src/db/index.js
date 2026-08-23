import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { config } from "../config.js";

mkdirSync(dirname(config.databaseFile), { recursive: true });

const db = new DatabaseSync(config.databaseFile);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS analyses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT    NOT NULL,
    owner       TEXT    NOT NULL,
    repo        TEXT    NOT NULL,
    score       INTEGER NOT NULL,
    grade       TEXT    NOT NULL,
    stars       INTEGER NOT NULL DEFAULT 0,
    language    TEXT,
    description TEXT,
    payload     TEXT    NOT NULL,
    analyzed_at TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_analyses_slug  ON analyses (slug);
  CREATE INDEX IF NOT EXISTS idx_analyses_score ON analyses (score DESC);
  CREATE INDEX IF NOT EXISTS idx_analyses_time  ON analyses (analyzed_at DESC);
`);

const statements = {
  insert: db.prepare(`
    INSERT INTO analyses (slug, owner, repo, score, grade, stars, language, description, payload, analyzed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  latestBySlug: db.prepare(`
    SELECT payload FROM analyses WHERE slug = ? ORDER BY analyzed_at DESC LIMIT 1
  `),

  // One row per repository - its most recent analysis.
  history: db.prepare(`
    SELECT slug, owner, repo, score, grade, stars, language, description, MAX(analyzed_at) AS analyzed_at
    FROM analyses
    GROUP BY slug
    ORDER BY analyzed_at DESC
    LIMIT ?
  `),

  leaderboard: db.prepare(`
    SELECT slug, owner, repo, score, grade, stars, language, description, MAX(analyzed_at) AS analyzed_at
    FROM analyses
    GROUP BY slug
    ORDER BY score DESC, stars DESC
    LIMIT ?
  `),

  timeline: db.prepare(`
    SELECT score, grade, analyzed_at FROM analyses WHERE slug = ? ORDER BY analyzed_at ASC LIMIT 50
  `),

  stats: db.prepare(`
    SELECT
      COUNT(*)                AS total_analyses,
      COUNT(DISTINCT slug)    AS unique_repos,
      COALESCE(ROUND(AVG(score), 1), 0) AS average_score,
      COALESCE(MAX(score), 0) AS best_score
    FROM analyses
  `),
};

export function saveAnalysis(payload) {
  const { metrics, rubric } = payload;
  statements.insert.run(
    metrics.repo.slug.toLowerCase(),
    metrics.repo.owner,
    metrics.repo.name,
    rubric.score,
    rubric.grade,
    metrics.social.stars ?? 0,
    metrics.languages[0]?.name ?? null,
    metrics.repo.description ?? null,
    JSON.stringify(payload),
    payload.analyzedAt
  );
}

export function findLatest(slug) {
  const row = statements.latestBySlug.get(slug.toLowerCase());
  return row ? JSON.parse(row.payload) : null;
}

/** SQLite gives us snake_case columns; the API speaks camelCase everywhere else. */
const toSummary = (row) => ({
  slug: row.slug,
  owner: row.owner,
  repo: row.repo,
  score: row.score,
  grade: row.grade,
  stars: row.stars,
  language: row.language,
  description: row.description,
  analyzedAt: row.analyzed_at,
});

export const listHistory = (limit = 12) => statements.history.all(limit).map(toSummary);
export const listLeaderboard = (limit = 20) => statements.leaderboard.all(limit).map(toSummary);

export const scoreTimeline = (slug) =>
  statements.timeline
    .all(slug.toLowerCase())
    .map((row) => ({ score: row.score, grade: row.grade, analyzedAt: row.analyzed_at }));

export function readStats() {
  const row = statements.stats.get();
  return {
    totalAnalyses: row.total_analyses,
    uniqueRepos: row.unique_repos,
    averageScore: row.average_score,
    bestScore: row.best_score,
  };
}

export default db;
