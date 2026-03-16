import type { NextFunction, Request, Response } from "express";

export const responseFormatter = () =>
  (_req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = (body?: unknown) => {
      if (body && typeof body === "object") {
        const record = body as Record<string, unknown>;

        if (record.success === true || record.success === false) {
          return originalJson(body);
        }

        const meta = res.locals.meta;
        const envelope: Record<string, unknown> = {
          success: true,
          data: body
        };

        if (meta && typeof meta === "object") {
          envelope.meta = meta;
        }

        return originalJson(envelope);
      }

      return originalJson(body);
    };

    next();
  };
