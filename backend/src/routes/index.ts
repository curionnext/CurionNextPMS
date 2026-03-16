import { Express, Router } from "express";
import { healthRouter } from "./system/health.router.js";
import { authRouter } from "./auth/auth.router.js";
import { userRouter } from "./users/user.router.js";
import { shiftRouter } from "./shifts/shift.router.js";
import { propertyRouter } from "./property/property.router.js";
import { reservationRouter } from "./reservations/reservation.router.js";
import { guestRouter } from "./guests/guest.router.js";
import { operationsRouter } from "./operations/operations.router.js";
import { billingRouter } from "./billing/billing.router.js";
import { dashboardRouter } from "./dashboard/dashboard.router.js";
import { reportsRouter } from "./reports/reports.router.js";
import { alertsRouter } from "./alerts/alerts.router.js";
import { nightAuditRouter } from "./night-audit/nightAudit.router.js";
import { otaRouter } from "./ota/ota.router.js";
import { whatsappRouter } from "./whatsapp/whatsapp.router.js";
import { multiPropertyRouter } from "./multi-property/multiProperty.router.js";
import transactionLogsRouter from "./transaction-logs/transactionLogs.router.js";
import { inventoryRouter } from "./inventory/inventory.router.js";
import { purchasingRouter } from "./purchasing/purchasing.router.js";
import { authenticate } from "../middlewares/auth.js";

const apiRouter = Router();
const protectedRouter = Router();

protectedRouter.use(authenticate);

protectedRouter.use("/users", userRouter);
protectedRouter.use("/shifts", shiftRouter);
protectedRouter.use("/property", propertyRouter);
protectedRouter.use("/reservations", reservationRouter);
protectedRouter.use("/guests", guestRouter);
protectedRouter.use("/operations", operationsRouter);
protectedRouter.use("/billing", billingRouter);
protectedRouter.use("/dashboard", dashboardRouter);
protectedRouter.use("/reports", reportsRouter);
protectedRouter.use("/alerts", alertsRouter);
protectedRouter.use("/night-audit", nightAuditRouter);
protectedRouter.use("/ota", otaRouter);
protectedRouter.use("/whatsapp", whatsappRouter);
protectedRouter.use("/multi-property", multiPropertyRouter);
protectedRouter.use("/transaction-logs", transactionLogsRouter);
protectedRouter.use("/inventory", inventoryRouter);
protectedRouter.use("/purchasing", purchasingRouter);

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use(protectedRouter);

export const registerRoutes = (app: Express) => {
  app.get("/", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", apiRouter);
};
