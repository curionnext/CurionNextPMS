import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./errorHandler.js";

type RateLimitEntry = {
    count: number;
    resetAt: number;
};

/**
 * Simple in-memory rate limiter.
 * @param maxAttempts Maximum allowed requests within the window
 * @param windowMs Time window in milliseconds
 */
export const rateLimit = (maxAttempts = 5, windowMs = 60_000) => {
    const store = new Map<string, RateLimitEntry>();

    // Cleanup expired entries every 5 minutes
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store) {
            if (entry.resetAt <= now) {
                store.delete(key);
            }
        }
    }, 5 * 60_000).unref();

    return (req: Request, _res: Response, next: NextFunction) => {
        const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
        const now = Date.now();
        const entry = store.get(ip);

        if (!entry || entry.resetAt <= now) {
            store.set(ip, { count: 1, resetAt: now + windowMs });
            next();
            return;
        }

        entry.count++;

        if (entry.count > maxAttempts) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            throw new HttpError(
                429,
                `Too many attempts. Try again in ${retryAfter} seconds.`,
                { retryAfter },
                "RATE_LIMITED"
            );
        }

        next();
    };
};
