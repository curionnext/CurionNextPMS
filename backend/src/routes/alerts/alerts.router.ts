import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../middlewares/errorHandler.js";
import { acknowledgeAlert, syncAlertsForHotel } from "../../services/alertsService.js";
import type { Role } from "../../types/auth.js";

const ALERT_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "FRONT_DESK", "HOUSEKEEPING", "ACCOUNTING"];

const acknowledgeSchema = z.object({
  body: z.object({
    alertId: z.string().min(1)
  })
});

export const alertsRouter = Router();

alertsRouter.get(
  "/",
  authenticate,
  authorize(ALERT_ROLES),
  asyncHandler(async (req, res) => {
    const hotelCode = req.user?.hotelCode;

    if (!hotelCode) {
      throw new HttpError(400, "Missing hotel context");
    }

    const alerts = await syncAlertsForHotel(hotelCode);
    res.json({ alerts });
  })
);

alertsRouter.post(
  "/acknowledge",
  authenticate,
  authorize(ALERT_ROLES),
  validateRequest(acknowledgeSchema),
  asyncHandler(async (req, res) => {
    const hotelCode = req.user?.hotelCode;

    if (!hotelCode) {
      throw new HttpError(400, "Missing hotel context");
    }

    const alert = await acknowledgeAlert(hotelCode, req.body.alertId, req.user?.sub);
    res.json({ alert });
  })
);
