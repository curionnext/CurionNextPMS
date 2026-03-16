import express from "express";
import helmet from "helmet";
import cors from "cors";
import { json, urlencoded } from "express";
import { configureLogger } from "./config/logger.js";
import { registerRoutes } from "./routes/index.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { responseFormatter } from "./middlewares/responseFormatter.js";

export const createApp = () => {
  const app = express();
  const logger = configureLogger();

  app.set("logger", logger);

  app.use(helmet());
  app.use(cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "http://localhost:5175",
      "http://127.0.0.1:5175",
      "http://localhost:5176",
      "http://127.0.0.1:5176",
      "https://curionnextpms-frontend.onrender.com"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  }));
  app.use(requestLogger(logger));
  app.use(json({ limit: "1mb" }));
  app.use(urlencoded({ extended: true }));
  app.use(responseFormatter());

  registerRoutes(app);

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
};
