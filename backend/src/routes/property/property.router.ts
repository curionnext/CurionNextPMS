import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createFloor,
  createRoom,
  createRoomType,
  deleteFloor,
  deleteRoom,
  deleteRoomType,
  getPropertyProfile,
  getTaxConfig,
  listFloors,
  listRoomTypes,
  listRooms,
  updateFloor,
  updateRoom,
  updateRoomType,
  upsertPropertyProfile,
  upsertTaxConfig
} from "../../services/propertyService.js";
import type { Role } from "../../types/auth.js";

const MANAGE_PROPERTY_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];
const ROOM_STATUS_VALUES = ["AVAILABLE", "OCCUPIED", "DIRTY", "OUT_OF_ORDER"] as const;

const propertyProfileSchema = z.object({
  body: z.object({
    hotelId: z.string().min(1).optional(),
    hotelCode: z.string().min(1).optional(),
    name: z.string().min(1),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    timezone: z.string().optional(),
    gstin: z.string().optional()
  })
});

const createRoomTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    shortCode: z.string().min(1),
    description: z.string().optional(),
    baseRate: z.coerce.number().min(0),
    occupancy: z.coerce.number().int().positive(),
    extraBedRate: z.coerce.number().min(0).optional(),
    amenities: z.array(z.string()).optional(),
    isActive: z.boolean().optional()
  })
});

const updateRoomTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    shortCode: z.string().min(1).optional(),
    description: z.string().optional(),
    baseRate: z.coerce.number().min(0).optional(),
    occupancy: z.coerce.number().int().positive().optional(),
    extraBedRate: z.coerce.number().min(0).optional(),
    amenities: z.array(z.string()).optional(),
    isActive: z.boolean().optional()
  })
});

const createRoomSchema = z.object({
  body: z.object({
    number: z.string().min(1),
    name: z.string().optional(),
    roomTypeId: z.string().min(1),
    status: z.enum(ROOM_STATUS_VALUES),
    rate: z.coerce.number().min(0),
    floor: z.coerce.number().int().optional(),
    floorId: z.string().optional(),
    buildingId: z.string().optional(),
    amenities: z.array(z.string()).optional(),
    maxOccupancy: z.coerce.number().int().positive(),
    hasExtraBed: z.boolean(),
    isActive: z.boolean().optional()
  })
});

const updateRoomSchema = z.object({
  body: z.object({
    number: z.string().min(1).optional(),
    name: z.string().optional(),
    roomTypeId: z.string().min(1).optional(),
    status: z.enum(ROOM_STATUS_VALUES).optional(),
    rate: z.coerce.number().min(0).optional(),
    floor: z.coerce.number().int().optional(),
    floorId: z.string().optional(),
    buildingId: z.string().optional(),
    amenities: z.array(z.string()).optional(),
    maxOccupancy: z.coerce.number().int().positive().optional(),
    hasExtraBed: z.boolean().optional(),
    isActive: z.boolean().optional()
  })
});

const createFloorSchema = z.object({
  body: z.object({
    number: z.coerce.number().int(),
    name: z.string().optional(),
    sortOrder: z.coerce.number().int().optional(),
    buildingId: z.string().optional()
  })
});

const updateFloorSchema = z.object({
  body: z.object({
    number: z.coerce.number().int().optional(),
    name: z.string().optional(),
    sortOrder: z.coerce.number().int().optional(),
    buildingId: z.string().optional()
  })
});

const taxConfigSchema = z.object({
  body: z.object({
    gstEnabled: z.boolean(),
    cgst: z.coerce.number().min(0),
    sgst: z.coerce.number().min(0),
    igst: z.coerce.number().min(0),
    serviceChargeEnabled: z.boolean(),
    serviceChargePercentage: z.coerce.number().min(0),
    luxuryTaxEnabled: z.boolean(),
    luxuryTaxPercentage: z.coerce.number().min(0)
  })
});

export const propertyRouter = Router();

propertyRouter.get(
  "/profile",
  authenticate,
  asyncHandler(async (_req, res) => {
    const profile = await getPropertyProfile();
    res.json({ profile });
  })
);

propertyRouter.put(
  "/profile",
  authenticate,
  authorize(MANAGE_PROPERTY_ROLES),
  validateRequest(propertyProfileSchema),
  asyncHandler(async (req, res) => {
    const profile = await upsertPropertyProfile(req.body);
    res.json({ profile });
  })
);

propertyRouter.get(
  "/room-types",
  authenticate,
  asyncHandler(async (_req, res) => {
    const roomTypes = await listRoomTypes();
    res.json({ roomTypes });
  })
);

propertyRouter.post(
  "/room-types",
  authenticate,
  authorize(MANAGE_PROPERTY_ROLES),
  validateRequest(createRoomTypeSchema),
  asyncHandler(async (req, res) => {
    const roomType = await createRoomType(req.body);
    res.status(201).json({ roomType });
  })
);

propertyRouter.put(
  "/room-types/:id",
  authenticate,
  authorize(MANAGE_PROPERTY_ROLES),
  validateRequest(updateRoomTypeSchema),
  asyncHandler(async (req, res) => {
    const roomType = await updateRoomType(req.params.id, req.body);
    res.json({ roomType });
  })
);

propertyRouter.delete(
  "/room-types/:id",
  authenticate,
  authorize(MANAGE_PROPERTY_ROLES),
  asyncHandler(async (req, res) => {
    await deleteRoomType(req.params.id);
    res.status(204).send();
  })
);

propertyRouter.get(
  "/rooms",
  authenticate,
  asyncHandler(async (_req, res) => {
    const rooms = await listRooms();
    res.json({ rooms });
  })
);

propertyRouter.post(
  "/rooms",
  authenticate,
  authorize(MANAGE_PROPERTY_ROLES),
  validateRequest(createRoomSchema),
  asyncHandler(async (req, res) => {
    const room = await createRoom(req.body);
    res.status(201).json({ room });
  })
);

propertyRouter.put(
  "/rooms/:id",
  authenticate,
  authorize(MANAGE_PROPERTY_ROLES),
  validateRequest(updateRoomSchema),
  asyncHandler(async (req, res) => {
    const room = await updateRoom(req.params.id, req.body);
    res.json({ room });
  })
);

propertyRouter.delete(
  "/rooms/:id",
  authenticate,
  authorize(MANAGE_PROPERTY_ROLES),
  asyncHandler(async (req, res) => {
    await deleteRoom(req.params.id);
    res.status(204).send();
  })
);

propertyRouter.get(
  "/floors",
  authenticate,
  asyncHandler(async (_req, res) => {
    const floors = await listFloors();
    res.json({ floors });
  })
);

propertyRouter.post(
  "/floors",
  authenticate,
  authorize(MANAGE_PROPERTY_ROLES),
  validateRequest(createFloorSchema),
  asyncHandler(async (req, res) => {
    const floor = await createFloor(req.body);
    res.status(201).json({ floor });
  })
);

propertyRouter.put(
  "/floors/:id",
  authenticate,
  authorize(MANAGE_PROPERTY_ROLES),
  validateRequest(updateFloorSchema),
  asyncHandler(async (req, res) => {
    const floor = await updateFloor(req.params.id, req.body);
    res.json({ floor });
  })
);

propertyRouter.delete(
  "/floors/:id",
  authenticate,
  authorize(MANAGE_PROPERTY_ROLES),
  asyncHandler(async (req, res) => {
    await deleteFloor(req.params.id);
    res.status(204).send();
  })
);

propertyRouter.get(
  "/taxes",
  authenticate,
  asyncHandler(async (_req, res) => {
    const taxes = await getTaxConfig();
    res.json({ taxes });
  })
);

propertyRouter.put(
  "/taxes",
  authenticate,
  authorize(MANAGE_PROPERTY_ROLES),
  validateRequest(taxConfigSchema),
  asyncHandler(async (req, res) => {
    const taxes = await upsertTaxConfig(req.body);
    res.json({ taxes });
  })
);
