import jwt from "jsonwebtoken";
import { getEnv } from "../config/env.js";
import type { AuthTokenPayload } from "../types/auth.js";

export const generateToken = (payload: AuthTokenPayload) => {
  const env = getEnv();

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: `${env.tokenExpiryMinutes}m`
  });
};
