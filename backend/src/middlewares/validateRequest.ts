import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject } from "zod";
import { HttpError } from "./errorHandler.js";

export const validateRequest = (schema: AnyZodObject) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!result.success) {
      throw new HttpError(400, "Validation failed", result.error.flatten(), "VALIDATION_FAILED");
    }

    next();
  };
