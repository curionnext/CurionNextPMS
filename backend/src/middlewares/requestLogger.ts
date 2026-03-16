import pinoHttp from "pino-http";
import type { Logger } from "pino";

export const requestLogger = (logger: Logger) =>
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url?.startsWith("/api/health") ?? false
    }
  });
