import { Router } from "express";
import { getEnv } from "../../config/env.js";

export const healthRouter = Router();

healthRouter.get("/live", (_req, res) => {
  res.json({ status: "live" });
});

healthRouter.get("/ready", async (_req, res) => {
  const env = getEnv();

  res.json({
    status: "ready",
    timestamp: new Date().toISOString(),
    env: env.env
  });
});
