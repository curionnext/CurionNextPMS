import pino from "pino";
import { getEnv } from "./env.js";

export const configureLogger = () => {
  const env = getEnv();

  return pino({
    level: env.logLevel
  });
};
