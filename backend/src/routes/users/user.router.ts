import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createUser, getUsers, updateUser } from "../../services/userService.js";
import type { Role } from "../../types/auth.js";

const MANAGE_USERS_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

const createUserSchema = z.object({
  body: z.object({
    hotelId: z.string().min(1),
    hotelCode: z.string().min(1),
    username: z.string().min(1),
    email: z.string().email(),
    displayName: z.string().min(1),
    password: z.string().min(6),
    roles: z.array(z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "FRONT_DESK", "HOUSEKEEPING", "ACCOUNTING", "POS"])).nonempty(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional()
  })
});

const updateUserSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    displayName: z.string().min(1).optional(),
    password: z.string().min(6).optional(),
    roles: z
      .array(z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "FRONT_DESK", "HOUSEKEEPING", "ACCOUNTING", "POS"]))
      .optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional()
  })
});

export const userRouter = Router();

userRouter.post(
  "/",
  authenticate,
  authorize(MANAGE_USERS_ROLES),
  validateRequest(createUserSchema),
  asyncHandler(async (req, res) => {
    const user = await createUser(req.body);
    res.status(201).json({ user });
  })
);

userRouter.get(
  "/",
  authenticate,
  authorize(MANAGE_USERS_ROLES),
  asyncHandler(async (req, res) => {
    const { hotelCode } = req.user ?? {};
    const users = await getUsers(hotelCode);
    res.json({ users });
  })
);

userRouter.put(
  "/:id",
  authenticate,
  authorize(MANAGE_USERS_ROLES),
  validateRequest(updateUserSchema),
  asyncHandler(async (req, res) => {
    const user = await updateUser(req.params.id, req.body);
    res.json({ user });
  })
);
