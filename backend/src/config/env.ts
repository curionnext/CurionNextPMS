import path from "path";
import { config } from "dotenv";

// Load environment variables from .env file
config();

type EnvConfig = {
  env: "development" | "test" | "production";
  port: number;
  jwtSecret: string;
  logLevel: string;
  dataDir: string;
  tokenExpiryMinutes: number;
};

let cachedConfig: EnvConfig | null = null;

const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getEnv = (): EnvConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const env = (process.env.NODE_ENV as EnvConfig["env"]) ?? "development";

  cachedConfig = {
    env,
    port: parseNumber(process.env.PORT, 4000),
    jwtSecret: (() => {
      const secret = process.env.JWT_SECRET;
      if (!secret && env === "production") {
        throw new Error("JWT_SECRET environment variable must be set in production");
      }
      return secret ?? "dev-only-secret-not-for-production";
    })(),
    logLevel: process.env.LOG_LEVEL ?? (env === "development" ? "debug" : "info"),
    dataDir: process.env.DATA_DIR ?? path.join("db", "data"),
    tokenExpiryMinutes: parseNumber(process.env.TOKEN_EXPIRY_MINUTES, 60)
  };

  return cachedConfig;
};
