import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { assignRoom, captureGuestId, checkIn, checkOut } from "../../services/checkinService.js";
import type { Role } from "../../types/auth.js";

const FRONT_DESK_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "FRONT_DESK"];

const assignRoomSchema = z.object({
  body: z.object({
    reservationId: z.string().min(1),
    roomId: z.string().min(1)
  })
});

const checkInSchema = z.object({
  body: z.object({
    reservationId: z.string().min(1),
    roomId: z.string().optional()
  })
});

const checkOutSchema = z.object({
  body: z.object({
    reservationId: z.string().min(1),
    lateCheckout: z.boolean().optional(),
    extraCharges: z
      .array(
        z.object({
          description: z.string().min(1),
          amount: z.coerce.number().min(0)
        })
      )
      .optional()
  })
});

const idCaptureSchema = z.object({
  body: z.object({
    guestId: z.string().min(1),
    document: z.object({
      type: z.string().min(1),
      number: z.string().min(1),
      issuedBy: z.string().optional(),
      issuedAt: z.string().optional(),
      expiresAt: z.string().optional(),
      fileUrl: z.string().optional(),
      capturedAt: z.string().optional()
    })
  })
});

export const operationsRouter = Router();

operationsRouter.put(
  "/room/assign",
  authenticate,
  authorize(FRONT_DESK_ROLES),
  validateRequest(assignRoomSchema),
  asyncHandler(async (req, res) => {
    const reservation = await assignRoom(req.body.reservationId, req.body.roomId);
    res.json({ reservation });
  })
);

operationsRouter.post(
  "/checkin",
  authenticate,
  authorize(FRONT_DESK_ROLES),
  validateRequest(checkInSchema),
  asyncHandler(async (req, res) => {
    const reservation = await checkIn(req.body);
    res.json({ reservation });
  })
);

operationsRouter.post(
  "/checkout",
  authenticate,
  authorize(FRONT_DESK_ROLES),
  validateRequest(checkOutSchema),
  asyncHandler(async (req, res) => {
    const result = await checkOut(req.body);
    res.json(result);
  })
);

operationsRouter.post(
  "/id-capture",
  authenticate,
  authorize(FRONT_DESK_ROLES),
  validateRequest(idCaptureSchema),
  asyncHandler(async (req, res) => {
    const guest = await captureGuestId(req.body.guestId, req.body.document);
    res.json({ guest });
  })
);
