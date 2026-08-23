import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { config } from "./config.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(express.json({ limit: "16kb" }));

  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin/tooling requests that send no Origin header (curl, health checks).
        if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
    })
  );

  // Each analysis costs up to 8 GitHub calls plus an LLM round trip.
  const writeLimiter = rateLimit({
    windowMs: 60_000,
    limit: 12,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many analyses from this IP. Please wait a minute and try again." },
  });

  // Reads hit SQLite only, so they can be far more generous.
  const readLimiter = rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      githubToken: Boolean(config.githubToken),
      aiEnabled: Boolean(config.groqApiKey),
    });
  });

  app.post("/api/analyze", writeLimiter);
  app.post("/api/compare", writeLimiter);
  app.use("/api", readLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
