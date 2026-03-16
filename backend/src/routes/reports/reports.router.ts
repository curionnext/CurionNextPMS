import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../middlewares/errorHandler.js";
import { getDailyReport, getRevenueReport } from "../../services/reportingService.js";
import type { Role } from "../../types/auth.js";

const REPORTING_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "FRONT_DESK", "ACCOUNTING"];

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const dailyQuerySchema = z.object({
  query: z.object({
    date: z.string().regex(dateRegex).optional()
  })
});

const revenueQuerySchema = z.object({
  query: z.object({
    startDate: z.string().regex(dateRegex).optional(),
    endDate: z.string().regex(dateRegex).optional()
  })
});

export const reportsRouter = Router();

reportsRouter.get(
  "/daily",
  authenticate,
  authorize(REPORTING_ROLES),
  validateRequest(dailyQuerySchema),
  asyncHandler(async (req, res) => {
    const hotelCode = req.user?.hotelCode;

    if (!hotelCode) {
      throw new HttpError(400, "Missing hotel context");
    }

    const report = await getDailyReport(hotelCode, req.query.date as string | undefined);
    res.json({ report });
  })
);

reportsRouter.get(
  "/revenue",
  authenticate,
  authorize(REPORTING_ROLES),
  validateRequest(revenueQuerySchema),
  asyncHandler(async (req, res) => {
    const hotelCode = req.user?.hotelCode;

    if (!hotelCode) {
      throw new HttpError(400, "Missing hotel context");
    }

    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const report = await getRevenueReport(hotelCode, { startDate, endDate });
    res.json({ report });
  })
);
