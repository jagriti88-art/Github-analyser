import { config } from "../config.js";
import { AppError } from "../utils/errors.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
export function errorHandler(error, req, res, next) {
  const isKnown = error instanceof AppError;
  const status = isKnown ? error.status : 500;

  if (!isKnown) {
    console.error("[error]", error);
  }

  res.status(status).json({
    error: isKnown ? error.message : "Something went wrong while analysing this repository.",
    ...(error.details ? { details: error.details } : {}),
    ...(config.nodeEnv === "development" && !isKnown ? { stack: error.stack } : {}),
  });
}
