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
    // Unexpected failures are opaque to whoever hits them, and on a deployed host
    // the logs may not be to hand. Name and code identify the fault without
    // exposing a stack trace or internal paths.
    ...(isKnown ? {} : { reference: [error.name, error.code].filter(Boolean).join(" / ") || "Error" }),
    ...(config.nodeEnv === "development" && !isKnown ? { stack: error.stack } : {}),
  });
}
