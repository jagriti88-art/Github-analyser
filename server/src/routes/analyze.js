import { Router } from "express";
import { config } from "../config.js";
import { fetchRepoData } from "../services/githubService.js";
import { scoreRepo } from "../services/scoring.js";
import { reviewRepo } from "../services/aiService.js";
import { parseRepoUrl } from "../utils/parseRepoUrl.js";
import { TtlCache } from "../utils/cache.js";

const cache = new TtlCache(config.cacheTtlMs);
export const analyzeRouter = Router();

/**
 * POST /api/analyze  { "repoUrl": "https://github.com/owner/repo" }
 *
 * Pass ?refresh=1 to bypass the cache.
 */
analyzeRouter.post("/analyze", async (req, res, next) => {
  try {
    const { owner, repo, slug } = parseRepoUrl(req.body?.repoUrl);
    const cacheKey = slug.toLowerCase();

    if (req.query.refresh !== "1") {
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json({ ...cached, cached: true });
      }
    }

    const startedAt = Date.now();
    const metrics = await fetchRepoData(owner, repo);
    const rubric = scoreRepo(metrics);
    const review = await reviewRepo(metrics, rubric);

    const payload = {
      cached: false,
      analyzedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      metrics,
      rubric,
      review,
    };

    cache.set(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});
