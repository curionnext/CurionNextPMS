import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createGuest, getGuestById, getGuests, updateGuest } from "../../services/guestService.js";
import type { Role } from "../../types/auth.js";

const MANAGE_GUESTS_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "FRONT_DESK"];

const guestSchema = z.object({
  hotelId: z.string().min(1),
  hotelCode: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  preferences: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional()
});

const updateGuestSchema = z.object({
  body: guestSchema.partial()
});

const createGuestSchema = z.object({
  body: guestSchema
});

export const guestRouter = Router();

guestRouter.post(
  "/",
  authenticate,
  authorize(MANAGE_GUESTS_ROLES),
  validateRequest(createGuestSchema),
  asyncHandler(async (req, res) => {
    const guest = await createGuest(req.body);
    res.status(201).json({ guest });
  })
);

guestRouter.get(
  "/",
  authenticate,
  authorize(MANAGE_GUESTS_ROLES),
  asyncHandler(async (req, res) => {
    const { hotelCode } = req.user ?? {};
    const guests = await getGuests(hotelCode);
    res.json({ guests });
  })
);

guestRouter.get(
  "/:id",
  authenticate,
  authorize(MANAGE_GUESTS_ROLES),
  asyncHandler(async (req, res) => {
    const guest = await getGuestById(req.params.id);

    if (!guest) {
      res.status(404).json({ error: "Guest not found" });
      return;
    }

    res.json({ guest });
  })
);

guestRouter.put(
  "/:id",
  authenticate,
  authorize(MANAGE_GUESTS_ROLES),
  validateRequest(updateGuestSchema),
  asyncHandler(async (req, res) => {
    const guest = await updateGuest(req.params.id, req.body);
    res.json({ guest });
  })
);
