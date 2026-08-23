import dotenv from "dotenv";

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: toInt(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV ?? "development",

  githubToken: process.env.GITHUB_TOKEN?.trim() || null,
  groqApiKey: process.env.GROQ_API_KEY?.trim() || null,
  groqModel: process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b",

  cacheTtlMs: toInt(process.env.CACHE_TTL_SECONDS, 600) * 1000,

  databaseFile: process.env.DATABASE_FILE?.trim() || "./data/gitgrade.db",

  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

/** Warnings worth printing once at boot rather than failing a request later. */
export function describeConfigWarnings() {
  const warnings = [];
  if (!config.githubToken) {
    warnings.push(
      "GITHUB_TOKEN is not set - GitHub limits you to 60 requests/hour. Add one to .env."
    );
  }
  if (!config.groqApiKey) {
    warnings.push(
      "GROQ_API_KEY is not set - analyses will return the deterministic score without AI review."
    );
  }
  return warnings;
}
