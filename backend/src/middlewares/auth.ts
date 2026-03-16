import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getEnv } from "../config/env.js";
import { HttpError } from "./errorHandler.js";
import type { AuthTokenPayload } from "../types/auth.js";

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") {
    next();
    return;
  }

  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new HttpError(401, "Missing authorization header", undefined, "AUTH_MISSING_TOKEN");
    }

    const token = header.replace("Bearer ", "");
    const env = getEnv();

    const payload = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
    } else {
      next(new HttpError(401, "Invalid or expired token", error, "AUTH_INVALID_TOKEN"));
    }
  }
};

export const authorize = (allowedRoles: AuthTokenPayload["roles"]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        throw new HttpError(401, "Unauthenticated", undefined, "AUTH_UNAUTHENTICATED");
      }

      const hasRole = user.roles.some((role) => allowedRoles.includes(role));

      if (!hasRole) {
        throw new HttpError(403, "Forbidden", undefined, "AUTH_FORBIDDEN");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
