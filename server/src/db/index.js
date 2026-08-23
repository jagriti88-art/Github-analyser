import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { config } from "../config.js";

/**
 * libSQL speaks SQLite. Locally it opens a plain file; in production it points at
 * Turso over HTTP, which is what makes this work on Vercel's read-only filesystem.
 */
function buildClient() {
  if (config.tursoUrl) {
    return createClient({ url: config.tursoUrl, authToken: config.tursoAuthToken });
  }

  // Local file mode - make sure the directory exists before opening it.
  mkdirSync(dirname(config.databaseFile), { recursive: true });
  return createClient({ url: `file:${config.databaseFile}` });
}

const db = buildClient();

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS analyses (
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
   )`,
  `CREATE INDEX IF NOT EXISTS idx_analyses_slug  ON analyses (slug)`,
  `CREATE INDEX IF NOT EXISTS idx_analyses_score ON analyses (score DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_analyses_time  ON analyses (analyzed_at DESC)`,
];

// Serverless cold starts would otherwise run the schema on every invocation.
// Memoising the promise means it runs once per instance, and concurrent callers
// all await the same work.
let schemaReady = null;

function ensureSchema() {
  schemaReady ??= (async () => {
    for (const statement of SCHEMA) {
      await db.execute(statement);
    }
  })();
  return schemaReady;
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

export async function saveAnalysis(payload) {
  await ensureSchema();
  const { metrics, rubric } = payload;

  await db.execute({
    sql: `INSERT INTO analyses
            (slug, owner, repo, score, grade, stars, language, description, payload, analyzed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      metrics.repo.slug.toLowerCase(),
      metrics.repo.owner,
      metrics.repo.name,
      rubric.score,
      rubric.grade,
      metrics.social.stars ?? 0,
      metrics.languages[0]?.name ?? null,
      metrics.repo.description ?? null,
      JSON.stringify(payload),
      payload.analyzedAt,
    ],
  });
}

export async function findLatest(slug) {
  await ensureSchema();
  const { rows } = await db.execute({
    sql: `SELECT payload FROM analyses WHERE slug = ? ORDER BY analyzed_at DESC LIMIT 1`,
    args: [slug.toLowerCase()],
  });
  return rows[0] ? JSON.parse(rows[0].payload) : null;
}

/** One row per repository - its most recent analysis. */
export async function listHistory(limit = 12) {
  await ensureSchema();
  const { rows } = await db.execute({
    sql: `SELECT slug, owner, repo, score, grade, stars, language, description,
                 MAX(analyzed_at) AS analyzed_at
          FROM analyses GROUP BY slug ORDER BY analyzed_at DESC LIMIT ?`,
    args: [limit],
  });
  return rows.map(toSummary);
}

export async function listLeaderboard(limit = 20) {
  await ensureSchema();
  const { rows } = await db.execute({
    sql: `SELECT slug, owner, repo, score, grade, stars, language, description,
                 MAX(analyzed_at) AS analyzed_at
          FROM analyses GROUP BY slug ORDER BY score DESC, stars DESC LIMIT ?`,
    args: [limit],
  });
  return rows.map(toSummary);
}

export async function scoreTimeline(slug) {
  await ensureSchema();
  const { rows } = await db.execute({
    sql: `SELECT score, grade, analyzed_at FROM analyses
          WHERE slug = ? ORDER BY analyzed_at ASC LIMIT 50`,
    args: [slug.toLowerCase()],
  });
  return rows.map((row) => ({ score: row.score, grade: row.grade, analyzedAt: row.analyzed_at }));
}

export async function readStats() {
  await ensureSchema();
  const { rows } = await db.execute(
    `SELECT COUNT(*) AS total_analyses,
            COUNT(DISTINCT slug) AS unique_repos,
            COALESCE(ROUND(AVG(score), 1), 0) AS average_score,
            COALESCE(MAX(score), 0) AS best_score
     FROM analyses`
  );
  const row = rows[0] ?? {};
  return {
    totalAnalyses: Number(row.total_analyses ?? 0),
    uniqueRepos: Number(row.unique_repos ?? 0),
    averageScore: Number(row.average_score ?? 0),
    bestScore: Number(row.best_score ?? 0),
  };
}

export default db;
