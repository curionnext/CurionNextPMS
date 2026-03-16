import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../middlewares/errorHandler.js";
import { getDashboardSummary } from "../../services/reportingService.js";
import type { Role } from "../../types/auth.js";

const DASHBOARD_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "FRONT_DESK", "ACCOUNTING"];

const summaryQuerySchema = z.object({
  query: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
  })
});

export const dashboardRouter = Router();

dashboardRouter.get(
  "/summary",
  authenticate,
  authorize(DASHBOARD_ROLES),
  validateRequest(summaryQuerySchema),
  asyncHandler(async (req, res) => {
    const hotelCode = req.user?.hotelCode;

    if (!hotelCode) {
      throw new HttpError(400, "Missing hotel context");
    }

    const data = await getDashboardSummary(hotelCode, req.query.date as string | undefined);
    res.json({ summary: data });
  })
);
