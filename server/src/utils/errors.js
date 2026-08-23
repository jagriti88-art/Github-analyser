/** An error whose message and status are safe to send to the client. */
export class AppError extends Error {
  constructor(message, status = 400, details = undefined) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(message, 400, details);
export const notFound = (message) => new AppError(message, 404);
export const rateLimited = (message) => new AppError(message, 429);
export const upstreamFailure = (message) => new AppError(message, 502);
