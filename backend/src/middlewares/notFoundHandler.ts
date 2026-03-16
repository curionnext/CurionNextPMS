import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./errorHandler.js";

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(new HttpError(404, "Resource not found", { path: req.originalUrl }, "NOT_FOUND"));
};
