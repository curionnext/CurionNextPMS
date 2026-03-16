import type { NextFunction, Request, Response } from "express";
import type { Logger } from "pino";

const defaultErrorCode = (statusCode: number) => {
  switch (statusCode) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHENTICATED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "UNPROCESSABLE_ENTITY";
    case 429:
      return "RATE_LIMITED";
    default:
      return "INTERNAL_ERROR";
  }
};

export class HttpError extends Error {
  statusCode: number;
  details?: unknown;
  code: string;

  constructor(statusCode: number, message: string, details?: unknown, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.code = code ?? defaultErrorCode(statusCode);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }
}

export const errorHandler = (logger: Logger) =>
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const isHttpError = err instanceof HttpError;
    const statusCode = isHttpError ? err.statusCode : 500;
    const message = isHttpError ? err.message : "Internal Server Error";
    const code = isHttpError ? err.code : "INTERNAL_ERROR";

    logger.error({ err }, "Request failed");

    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message: err instanceof Error ? err.message : message,
        statusCode,
        stack: err instanceof Error ? err.stack : undefined,
        details: isHttpError ? err.details : undefined
      }
    });
  };
