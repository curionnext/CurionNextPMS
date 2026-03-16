import { createServer } from "http";
import type { Logger } from "pino";
import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";
import { bootstrapData } from "./startup/bootstrap.js";

const env = getEnv();
const app = createApp();
const logger = app.get("logger") as Logger;
const server = createServer(app);

const start = async () => {
  try {
    await bootstrapData(logger);
    server.listen(env.port, () => {
      const address = server.address();
      logger.info({ address }, "Server started");
    });
  } catch (error) {
    logger.error({ error, message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, "Failed to start server");
    console.error("Detailed error:", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught exception");
  process.exit(1);
});

start();
// trigger reload for inventory seed

// Trigger reload