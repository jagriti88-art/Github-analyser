import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { config } from "./config.js";
import { analyzeRouter } from "./routes/analyze.js";
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
  const analyzeLimiter = rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many analyses from this IP. Please wait a minute and try again." },
  });

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      githubToken: Boolean(config.githubToken),
      aiEnabled: Boolean(config.groqApiKey),
    });
  });

  app.use("/api", analyzeLimiter, analyzeRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
