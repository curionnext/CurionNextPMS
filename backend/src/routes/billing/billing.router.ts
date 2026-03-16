import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  addAddonCharge,
  generateInvoice,
  getBillSummary,
  postRoomCharges,
  settleBill
} from "../../services/billingService.js";
import type { Role } from "../../types/auth.js";

const BILLING_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTING", "FRONT_DESK"];

const roomChargeSchema = z.object({
  body: z.object({
    reservationId: z.string().min(1),
    dates: z.array(z.string()).optional(),
    folioId: z.string().optional(),
    folioName: z.string().optional(),
    nightlyRate: z.coerce.number().min(0).optional()
  })
});

const addonSchema = z.object({
  body: z.object({
    reservationId: z.string().min(1),
    description: z.string().min(1),
    amount: z.coerce.number().positive(),
    quantity: z.coerce.number().positive().optional(),
    folioId: z.string().optional(),
    folioName: z.string().optional(),
    metadata: z.record(z.any()).optional()
  })
});

const settlementSchema = z.object({
  body: z.object({
    reservationId: z.string().min(1),
    payments: z
      .array(
        z.object({
          amount: z.coerce.number().positive(),
          mode: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER", "CREDIT", "OTHER"]),
          reference: z.string().optional(),
          folioId: z.string().optional(),
          folioName: z.string().optional(),
          currency: z.string().optional(),
          metadata: z.record(z.any()).optional()
        })
      )
      .min(1)
  })
});

export const billingRouter = Router();

billingRouter.post(
  "/room-charges",
  authenticate,
  authorize(BILLING_ROLES),
  validateRequest(roomChargeSchema),
  asyncHandler(async (req, res) => {
    const result = await postRoomCharges(req.body);
    res.json(result);
  })
);

billingRouter.post(
  "/addons",
  authenticate,
  authorize(BILLING_ROLES),
  validateRequest(addonSchema),
  asyncHandler(async (req, res) => {
    const result = await addAddonCharge(req.body);
    res.status(201).json(result);
  })
);

billingRouter.get(
  "/:reservationId",
  authenticate,
  authorize(BILLING_ROLES),
  asyncHandler(async (req, res) => {
    const summary = await getBillSummary(req.params.reservationId);
    res.json(summary);
  })
);

billingRouter.post(
  "/settle",
  authenticate,
  authorize(BILLING_ROLES),
  validateRequest(settlementSchema),
  asyncHandler(async (req, res) => {
    const result = await settleBill(req.body);
    res.json(result);
  })
);

billingRouter.get(
  "/invoice/:reservationId",
  authenticate,
  authorize(BILLING_ROLES),
  asyncHandler(async (req, res) => {
    const invoice = await generateInvoice(req.params.reservationId);
    res.json({ invoice });
  })
);
