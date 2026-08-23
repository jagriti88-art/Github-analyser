import { config } from "../config.js";
import { fetchRepoData } from "./githubService.js";
import { scoreRepo } from "./scoring.js";
import { reviewRepo } from "./aiService.js";
import { TtlCache } from "../utils/cache.js";
import { saveAnalysis, scoreTimeline } from "../db/index.js";

const cache = new TtlCache(config.cacheTtlMs);

/**
 * Runs the full pipeline for one repository: GitHub fetch -> deterministic rubric ->
 * AI review -> persist. Results are cached in memory and stored in SQLite so the same
 * repo is never re-analysed on every page load.
 *
 * @param {{owner: string, repo: string, slug: string}} target
 * @param {{refresh?: boolean, skipAi?: boolean}} options
 */
export async function runAnalysis(target, { refresh = false, skipAi = false } = {}) {
  const cacheKey = target.slug.toLowerCase();

  if (!refresh) {
    const cached = cache.get(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  const startedAt = Date.now();
  const metrics = await fetchRepoData(target.owner, target.repo);
  const rubric = scoreRepo(metrics);
  const review = skipAi ? null : await reviewRepo(metrics, rubric);

  const payload = {
    cached: false,
    analyzedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    metrics,
    rubric,
    review,
  };

  cache.set(cacheKey, payload);

  try {
    saveAnalysis(payload);
  } catch (error) {
    // Persistence is a convenience, never a reason to fail the request.
    console.error("[db] failed to store analysis:", error.message);
  }

  // Attach the historical trend once the current run is recorded.
  payload.timeline = scoreTimeline(cacheKey);
  return payload;
}

/** Compares two repositories, highlighting which one wins each rubric category. */
export async function compareRepos(left, right, options = {}) {
  const [a, b] = await Promise.all([
    runAnalysis(left, { ...options, skipAi: true }),
    runAnalysis(right, { ...options, skipAi: true }),
  ]);

  const categories = a.rubric.categories.map((category, index) => {
    const other = b.rubric.categories[index];
    return {
      title: category.title,
      key: category.key,
      left: category.percent,
      right: other.percent,
      winner: category.percent === other.percent ? "tie" : category.percent > other.percent ? "left" : "right",
    };
  });

  return {
    analyzedAt: new Date().toISOString(),
    left: { metrics: a.metrics, rubric: a.rubric },
    right: { metrics: b.metrics, rubric: b.rubric },
    categories,
    winner:
      a.rubric.score === b.rubric.score ? "tie" : a.rubric.score > b.rubric.score ? "left" : "right",
    margin: Math.abs(a.rubric.score - b.rubric.score),
  };
}
