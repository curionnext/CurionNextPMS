import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createReservation,
  deleteReservation,
  getAvailability,
  listReservations,
  updateReservation
} from "../../services/reservationService.js";
import type { Role } from "../../types/auth.js";

const MANAGE_RESERVATIONS_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "FRONT_DESK"];

const ratePlanValues = ["BAR", "CORPORATE", "PACKAGE"] as const;
const reservationStatusValues = ["DRAFT", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"] as const;
const reservationSourceValues = ["DIRECT", "OTA", "CORPORATE", "WALK_IN", "SOCIAL"] as const;

const createReservationSchema = z.object({
  body: z.object({
    hotelId: z.string().min(1),
    hotelCode: z.string().min(1),
    guestId: z.string().min(1),
    roomType: z.string().min(1),
    roomId: z.string().optional(),
    status: z.enum(reservationStatusValues).optional(),
    arrivalDate: z.string().min(1),
    departureDate: z.string().min(1),
    adults: z.coerce.number().int().positive(),
    children: z.coerce.number().int().min(0),
    nightlyRate: z.coerce.number().min(0),
    ratePlan: z.enum(ratePlanValues),
    source: z.enum(reservationSourceValues),
    otaReference: z.string().optional(),
    isWalkIn: z.boolean().optional(),
    notes: z.string().optional(),
    currency: z.string().optional()
  })
});

const updateReservationSchema = z.object({
  body: z.object({
    roomId: z.string().optional(),
    roomType: z.string().optional(),
    status: z.enum(reservationStatusValues).optional(),
    arrivalDate: z.string().optional(),
    departureDate: z.string().optional(),
    adults: z.coerce.number().int().positive().optional(),
    children: z.coerce.number().int().min(0).optional(),
    nightlyRate: z.coerce.number().min(0).optional(),
    ratePlan: z.enum(ratePlanValues).optional(),
    source: z.enum(reservationSourceValues).optional(),
    otaReference: z.string().optional(),
    isWalkIn: z.boolean().optional(),
    notes: z.string().optional(),
    currency: z.string().optional()
  })
});

const availabilitySchema = z.object({
  query: z.object({
    arrivalDate: z.string().min(1),
    departureDate: z.string().min(1),
    roomType: z.string().optional()
  })
});

export const reservationRouter = Router();

reservationRouter.post(
  "/",
  authenticate,
  authorize(MANAGE_RESERVATIONS_ROLES),
  validateRequest(createReservationSchema),
  asyncHandler(async (req, res) => {
    const reservation = await createReservation(req.body);
    res.status(201).json({ reservation });
  })
);

reservationRouter.get(
  "/",
  authenticate,
  authorize(MANAGE_RESERVATIONS_ROLES),
  asyncHandler(async (req, res) => {
    const { hotelCode } = req.user ?? {};
    const reservations = await listReservations(hotelCode);
    res.json({ reservations });
  })
);

reservationRouter.put(
  "/:id",
  authenticate,
  authorize(MANAGE_RESERVATIONS_ROLES),
  validateRequest(updateReservationSchema),
  asyncHandler(async (req, res) => {
    const reservation = await updateReservation(req.params.id, req.body);
    res.json({ reservation });
  })
);

reservationRouter.delete(
  "/:id",
  authenticate,
  authorize(MANAGE_RESERVATIONS_ROLES),
  asyncHandler(async (req, res) => {
    await deleteReservation(req.params.id);
    res.status(204).send();
  })
);

reservationRouter.get(
  "/availability",
  authenticate,
  authorize(MANAGE_RESERVATIONS_ROLES),
  validateRequest(availabilitySchema),
  asyncHandler(async (req, res) => {
    const { hotelCode } = req.user ?? {};

    if (!hotelCode) {
      res.status(400).json({ error: "Hotel context is required" });
      return;
    }

    const { arrivalDate, departureDate, roomType } = availabilitySchema.parse({ query: req.query }).query;
    const availability = await getAvailability(hotelCode, { arrivalDate, departureDate, roomType });
    res.json({ availability });
  })
);
