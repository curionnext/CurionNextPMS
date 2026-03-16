import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authorize } from "../../middlewares/auth.js";
import { nightAuditService } from "../../services/nightAuditService.js";
import { HttpError } from "../../middlewares/errorHandler.js";

export const nightAuditRouter = Router();

/**
 * GET /api/night-audit
 * Get all night audits for the hotel
 * Accessible by: ADMIN, MANAGER, ACCOUNTING
 */
nightAuditRouter.get(
  "/",
  authorize(["ADMIN", "MANAGER", "ACCOUNTING"]),
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode } = req.user!;
    const audits = await nightAuditService.getAudits(hotelId, hotelCode);
    res.json({ success: true, data: audits });
  })
);

/**
 * GET /api/night-audit/latest
 * Get latest audit
 * Accessible by: ADMIN, MANAGER, ACCOUNTING
 */
nightAuditRouter.get(
  "/latest",
  authorize(["ADMIN", "MANAGER", "ACCOUNTING"]),
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode } = req.user!;
    const audit = await nightAuditService.getLatestAudit(hotelId, hotelCode);
    res.json({ success: true, data: audit });
  })
);

/**
 * GET /api/night-audit/check-required
 * Check if audit is required
 * Accessible by: ADMIN, MANAGER, ACCOUNTING
 */
nightAuditRouter.get(
  "/check-required",
  authorize(["ADMIN", "MANAGER", "ACCOUNTING"]),
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode } = req.user!;
    const isRequired = await nightAuditService.isAuditRequired(hotelId, hotelCode);
    res.json({ success: true, data: { isRequired } });
  })
);

/**
 * GET /api/night-audit/:id
 * Get specific audit by ID
 * Accessible by: ADMIN, MANAGER, ACCOUNTING
 */
nightAuditRouter.get(
  "/:id",
  authorize(["ADMIN", "MANAGER", "ACCOUNTING"]),
  asyncHandler(async (req, res) => {
    const { hotelId } = req.user!;
    const { id } = req.params;
    const audit = await nightAuditService.getAuditById(id, hotelId);
    res.json({ success: true, data: audit });
  })
);

/**
 * POST /api/night-audit/start
 * Start a new night audit
 * RESTRICTED: Only ADMIN and MANAGER can start audits
 */
nightAuditRouter.post(
  "/start",
  authorize(["ADMIN", "MANAGER"]),
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode, userId, sub } = req.user!;
    const { businessDate } = req.body;
    
    const audit = await nightAuditService.startAudit(
      hotelId,
      hotelCode,
      userId || sub,
      businessDate
    );
    
    res.json({ success: true, data: audit });
  })
);

/**
 * POST /api/night-audit/:id/retry
 * Retry a failed audit
 * RESTRICTED: Only ADMIN and MANAGER can retry audits
 */
nightAuditRouter.post(
  "/:id/retry",
  authorize(["ADMIN", "MANAGER"]),
  asyncHandler(async (req, res) => {
    const { hotelId, userId, sub } = req.user!;
    const { id } = req.params;
    
    const audit = await nightAuditService.retryAudit(id, hotelId, userId || sub);
    res.json({ success: true, data: audit });
  })
);
