import { Router } from "express";

import { runAnalysis, compareRepos } from "../services/analysisService.js";
import { badgeForScore, notAnalyzedBadge } from "../services/badgeService.js";
import { parseRepoUrl } from "../utils/parseRepoUrl.js";
import { badRequest, notFound } from "../utils/errors.js";
import { findLatest, listHistory, listLeaderboard, readStats, scoreTimeline } from "../db/index.js";

export const apiRouter = Router();

const clampLimit = (value, fallback, max) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), max) : fallback;
};

/** POST /api/analyze  { repoUrl }  - full analysis. `?refresh=1` bypasses the cache. */
apiRouter.post("/analyze", async (req, res, next) => {
  try {
    const target = parseRepoUrl(req.body?.repoUrl);
    res.json(await runAnalysis(target, { refresh: req.query.refresh === "1" }));
  } catch (error) {
    next(error);
  }
});

/** POST /api/compare  { left, right }  - side-by-side rubric comparison, no AI call. */
apiRouter.post("/compare", async (req, res, next) => {
  try {
    const left = parseRepoUrl(req.body?.left);
    const right = parseRepoUrl(req.body?.right);

    if (left.slug.toLowerCase() === right.slug.toLowerCase()) {
      throw badRequest("Pick two different repositories to compare.");
    }

    res.json(await compareRepos(left, right, { refresh: req.query.refresh === "1" }));
  } catch (error) {
    next(error);
  }
});

/** GET /api/repos/:owner/:repo - the stored analysis, so results are shareable by URL. */
apiRouter.get("/repos/:owner/:repo", (req, res, next) => {
  try {
    const { slug } = parseRepoUrl(`${req.params.owner}/${req.params.repo}`);
    const stored = findLatest(slug);

    if (!stored) {
      throw notFound(`${slug} has not been analysed yet. Run an analysis first.`);
    }

    res.json({ ...stored, cached: true, timeline: scoreTimeline(slug) });
  } catch (error) {
    next(error);
  }
});

/** GET /api/history?limit=12 - most recently analysed repositories. */
apiRouter.get("/history", (req, res, next) => {
  try {
    res.json({ items: listHistory(clampLimit(req.query.limit, 12, 50)) });
  } catch (error) {
    next(error);
  }
});

/** GET /api/leaderboard?limit=20 - highest scoring repositories seen so far. */
apiRouter.get("/leaderboard", (req, res, next) => {
  try {
    res.json({ items: listLeaderboard(clampLimit(req.query.limit, 20, 100)) });
  } catch (error) {
    next(error);
  }
});

/** GET /api/stats - aggregate counters for the landing page. */
apiRouter.get("/stats", (req, res, next) => {
  try {
    res.json(readStats());
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/badge/:owner/:repo.svg - an embeddable score badge.
 * `?style=flat-square` and `?label=` are supported; `?analyse=1` grades on demand.
 */
apiRouter.get("/badge/:owner/:repo.svg", async (req, res, next) => {
  try {
    const target = parseRepoUrl(`${req.params.owner}/${req.params.repo}`);
    const options = {
      style: req.query.style === "flat-square" ? "flat-square" : "flat",
      ...(req.query.label ? { label: String(req.query.label).slice(0, 40) } : {}),
    };

    let stored = findLatest(target.slug);
    if (!stored && req.query.analyse === "1") {
      stored = await runAnalysis(target, { skipAi: true });
    }

    // Badges are embedded in READMEs, so they must never render an error page.
    res.type("image/svg+xml");
    res.set("Cache-Control", "public, max-age=1800, s-maxage=1800");
    res.send(stored ? badgeForScore(stored.rubric, options) : notAnalyzedBadge(options));
  } catch (error) {
    next(error);
  }
});
