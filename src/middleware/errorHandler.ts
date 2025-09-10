import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { HttpError } from "../utils/httpError";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err?.message || "Internal Server Error";
  if (status >= 500) logger.error({ err }, message);
  else logger.warn({ err }, message);

  res.status(status).json({
    ok: false,
    error: { message, status, details: err?.details ?? undefined }
  });
}