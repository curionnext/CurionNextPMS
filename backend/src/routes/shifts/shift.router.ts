import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getActiveShifts } from "../../services/shiftService.js";
import type { Role } from "../../types/auth.js";

const VIEW_SHIFTS_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "FRONT_DESK"];

export const shiftRouter = Router();

shiftRouter.get(
  "/active",
  authenticate,
  authorize(VIEW_SHIFTS_ROLES),
  asyncHandler(async (req, res) => {
    const { hotelCode } = req.user ?? {};
    const shifts = await getActiveShifts(hotelCode);
    res.json({ shifts });
  })
);
