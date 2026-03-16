import { HttpError } from "../middlewares/errorHandler.js";
import { db } from "../db/index.js";
import type {
  FloorRecord,
  PropertyProfile,
  RoomRecord,
  RoomStatus,
  RoomTypeRecord,
  TaxConfig
} from "../types/domain.js";

const propertyTable = db.property;
const roomTypesTable = db.roomTypes;
const roomsTable = db.rooms;
const floorsTable = db.floors;
const taxesTable = db.taxes;

const now = () => new Date().toISOString();

const ROOM_STATUS_TRANSITIONS: Record<RoomStatus, RoomStatus[]> = {
  AVAILABLE: ["OCCUPIED", "DIRTY", "OUT_OF_ORDER"],
  OCCUPIED: ["DIRTY", "AVAILABLE", "OUT_OF_ORDER"], // Allow manual overrides
  DIRTY: ["AVAILABLE", "OUT_OF_ORDER", "OCCUPIED"], // Allow rush check-ins
  OUT_OF_ORDER: ["AVAILABLE", "DIRTY"]
};

const normalizeCode = (value: string) => value.trim().toUpperCase();

const sanitizeAmenities = (amenities?: string[]) =>
  amenities?.map((amenity) => amenity.trim()).filter(Boolean) ?? [];

const DEFAULT_ROOM_AMENITIES: string[] = [];
const DEFAULT_ROOMTYPE_AMENITIES: string[] = [];

const DEFAULT_TAX_VALUES = {
  gstEnabled: true,
  cgst: 0,
  sgst: 0,
  igst: 0,
  serviceChargeEnabled: false,
  serviceChargePercentage: 0,
  luxuryTaxEnabled: false,
  luxuryTaxPercentage: 0
};

export type PropertyProfileInput = Omit<PropertyProfile, "id" | "updatedAt"> & { id?: string };

export type RoomTypeInput = {
  name: string;
  shortCode: string;
  description?: string;
  baseRate: number;
  occupancy: number;
  extraBedRate?: number;
  amenities?: string[];
  isActive?: boolean;
};

export type UpdateRoomTypeInput = Partial<RoomTypeInput>;

export type RoomInput = {
  number: string;
  name?: string;
  roomTypeId: string;
  status: RoomStatus;
  rate: number;
  floor?: number;
  floorId?: string;
  buildingId?: string;
  amenities?: string[];
  maxOccupancy: number;
  hasExtraBed: boolean;
  isActive?: boolean;
};

export type UpdateRoomInput = Partial<RoomInput>;

export type FloorInput = {
  number: number;
  name?: string;
  sortOrder?: number;
  buildingId?: string;
};

export type UpdateFloorInput = Partial<FloorInput>;

export type TaxConfigInput = Omit<TaxConfig, "id" | "updatedAt"> & { id?: string };

export const getPropertyProfile = async (): Promise<PropertyProfile | null> => {
  const records = await propertyTable.getAll();
  return records[0] ?? null;
};

const ensurePropertyProfile = async (): Promise<PropertyProfile> => {
  const profile = await getPropertyProfile();

  if (!profile) {
    throw new HttpError(400, "Property profile is not configured");
  }

  return profile;
};

export const upsertPropertyProfile = async (input: PropertyProfileInput) => {
  const existing = await getPropertyProfile();
  const timestamp = now();

  if (existing) {
    const updated = await propertyTable.update(existing.id, {
      hotelId: input.hotelId ?? existing.hotelId,
      hotelCode: input.hotelCode ?? existing.hotelCode,
      name: input.name,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      state: input.state,
      country: input.country,
      postalCode: input.postalCode,
      phone: input.phone,
      email: input.email,
      timezone: input.timezone,
      gstin: input.gstin ?? existing.gstin,
      updatedAt: timestamp
    });

    return updated;
  }

  if (!input.hotelId || !input.hotelCode || !input.name) {
    throw new HttpError(400, "hotelId, hotelCode, and name are required to create the property profile");
  }

  const record: Omit<PropertyProfile, "id"> = {
    hotelId: input.hotelId,
    hotelCode: input.hotelCode,
    name: input.name,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    city: input.city,
    state: input.state,
    country: input.country,
    postalCode: input.postalCode,
    phone: input.phone,
    email: input.email,
    timezone: input.timezone,
    gstin: input.gstin,
    updatedAt: timestamp
  };

  return propertyTable.insert(record);
};

const ensureRoomType = async (hotelCode: string, roomTypeId: string): Promise<RoomTypeRecord> => {
  const record = await roomTypesTable.getById(roomTypeId);

  if (!record || record.hotelCode !== hotelCode) {
    throw new HttpError(400, "Room type does not exist");
  }

  return {
    ...record,
    shortCode: record.shortCode ?? normalizeCode(record.name),
    amenities: Array.isArray(record.amenities) ? record.amenities : DEFAULT_ROOMTYPE_AMENITIES,
    extraBedRate: record.extraBedRate ?? 0,
    isActive: record.isActive ?? true
  };
};

const ensureFloorForHotel = async (hotelCode: string, floorId?: string): Promise<FloorRecord | undefined> => {
  if (!floorId) {
    return undefined;
  }

  const floor = await floorsTable.getById(floorId);

  if (!floor || floor.hotelCode !== hotelCode) {
    throw new HttpError(400, "Floor does not exist");
  }

  return {
    ...floor,
    sortOrder: typeof floor.sortOrder === "number" ? floor.sortOrder : 0
  };
};

const assertValidRoomStatusTransition = (current: RoomStatus, next: RoomStatus) => {
  if (current === next) {
    return;
  }

  const allowed = ROOM_STATUS_TRANSITIONS[current];

  if (!allowed.includes(next)) {
    throw new HttpError(400, `Cannot transition room status from ${current} to ${next}`);
  }
};

export const listRoomTypes = async () => {
  const profile = await ensurePropertyProfile();
  const records = await roomTypesTable.getAll();
  return records
    .filter((record) => record.hotelCode === profile.hotelCode)
    .map((record) => ({
      ...record,
      shortCode: record.shortCode ?? normalizeCode(record.name),
      amenities: Array.isArray(record.amenities) ? record.amenities : DEFAULT_ROOMTYPE_AMENITIES,
      extraBedRate: record.extraBedRate ?? 0,
      isActive: record.isActive ?? true
    }));
};

export const createRoomType = async (input: RoomTypeInput) => {
  const profile = await ensurePropertyProfile();
  const existing = await listRoomTypes();
  const normalizedName = input.name.trim();
  const shortCode = normalizeCode(input.shortCode);

  if (!normalizedName) {
    throw new HttpError(400, "Room type name is required");
  }

  if (!shortCode) {
    throw new HttpError(400, "Room type short code is required");
  }

  const duplicateName = existing.find((record) => record.name.trim().toLowerCase() === normalizedName.toLowerCase());

  if (duplicateName) {
    throw new HttpError(409, "Room type name already exists");
  }

  const duplicateCode = existing.find((record) => normalizeCode(record.shortCode) === shortCode);

  if (duplicateCode) {
    throw new HttpError(409, "Room type short code already exists");
  }

  const timestamp = now();

  const record: Omit<RoomTypeRecord, "id"> = {
    hotelId: profile.hotelId,
    hotelCode: profile.hotelCode,
    name: normalizedName,
    shortCode,
    description: input.description,
    baseRate: input.baseRate,
    occupancy: input.occupancy,
    extraBedRate: input.extraBedRate ?? 0,
    amenities: sanitizeAmenities(input.amenities) ?? DEFAULT_ROOMTYPE_AMENITIES,
    isActive: input.isActive ?? true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  return roomTypesTable.insert(record);
};

export const updateRoomType = async (id: string, input: UpdateRoomTypeInput) => {
  const profile = await ensurePropertyProfile();
  const existing = await roomTypesTable.getById(id);

  if (!existing || existing.hotelCode !== profile.hotelCode) {
    throw new HttpError(404, "Room type not found");
  }

  const roomTypes = await listRoomTypes();

  if (input.name) {
    const normalizedName = input.name.trim().toLowerCase();
    const duplicateName = roomTypes.find((record) => record.id !== id && record.name.trim().toLowerCase() === normalizedName);

    if (duplicateName) {
      throw new HttpError(409, "Room type name already exists");
    }
  }

  if (input.shortCode) {
    const normalizedCode = normalizeCode(input.shortCode);
    const duplicateCode = roomTypes.find(
      (record) => record.id !== id && normalizeCode(record.shortCode) === normalizedCode
    );

    if (duplicateCode) {
      throw new HttpError(409, "Room type short code already exists");
    }
  }

  const updated = await roomTypesTable.update(id, {
    name: input.name?.trim() ?? existing.name,
    shortCode: input.shortCode ? normalizeCode(input.shortCode) : (existing.shortCode ?? normalizeCode(existing.name)),
    description: input.description ?? existing.description,
    baseRate: input.baseRate ?? existing.baseRate,
    occupancy: input.occupancy ?? existing.occupancy,
    extraBedRate: input.extraBedRate ?? existing.extraBedRate ?? 0,
    amenities: input.amenities ? sanitizeAmenities(input.amenities) : (Array.isArray(existing.amenities) ? existing.amenities : DEFAULT_ROOMTYPE_AMENITIES),
    isActive: input.isActive ?? existing.isActive ?? true,
    updatedAt: now()
  });

  return updated;
};

export const deleteRoomType = async (id: string) => {
  const profile = await ensurePropertyProfile();
  const existing = await roomTypesTable.getById(id);

  if (!existing || existing.hotelCode !== profile.hotelCode) {
    throw new HttpError(404, "Room type not found");
  }

  const rooms = await roomsTable.getAll();
  const roomsUsingType = rooms.filter(
    (room) =>
      room.hotelCode === profile.hotelCode &&
      (room.roomTypeId === id || normalizeCode(room.type) === normalizeCode(existing.shortCode ?? existing.name))
  );

  if (roomsUsingType.length > 0) {
    throw new HttpError(400, "Cannot delete room type while rooms are assigned");
  }

  await roomTypesTable.delete(id);
};

export const listRooms = async () => {
  const profile = await ensurePropertyProfile();
  const records = await roomsTable.getAll();
  return records
    .filter((record) => record.hotelCode === profile.hotelCode)
    .map((record) => ({
      ...record,
      amenities: Array.isArray(record.amenities) ? record.amenities : DEFAULT_ROOM_AMENITIES,
      maxOccupancy: record.maxOccupancy ?? 2,
      hasExtraBed: record.hasExtraBed ?? false,
      isActive: record.isActive ?? true
    }));
};

const ensureUniqueRoomNumber = (rooms: RoomRecord[], number: string, excludeId?: string) => {
  const normalizedNumber = number.trim().toLowerCase();
  const duplicate = rooms.find((room) => room.id !== excludeId && room.number.trim().toLowerCase() === normalizedNumber);

  if (duplicate) {
    throw new HttpError(409, "Room number already exists");
  }
};

export const createRoom = async (input: RoomInput) => {
  const profile = await ensurePropertyProfile();
  const roomType = await ensureRoomType(profile.hotelCode, input.roomTypeId);
  const floor = await ensureFloorForHotel(profile.hotelCode, input.floorId);
  const rooms = await listRooms();

  ensureUniqueRoomNumber(rooms, input.number);

  if (input.maxOccupancy < 1) {
    throw new HttpError(400, "Max occupancy must be at least 1");
  }

  const timestamp = now();

  const record: Omit<RoomRecord, "id"> = {
    hotelId: profile.hotelId,
    hotelCode: profile.hotelCode,
    number: input.number.trim(),
    name: input.name ?? `${roomType.name} ${input.number.trim()}`,
    type: roomType.shortCode ?? normalizeCode(roomType.name),
    roomTypeId: roomType.id,
    status: input.status,
    rate: input.rate,
    floor: input.floor ?? floor?.number,
    floorId: floor?.id ?? input.floorId,
    buildingId: input.buildingId ?? floor?.buildingId,
    amenities: sanitizeAmenities(input.amenities) ?? DEFAULT_ROOM_AMENITIES,
    maxOccupancy: input.maxOccupancy,
    hasExtraBed: input.hasExtraBed,
    isActive: input.isActive ?? true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  return roomsTable.insert(record);
};

export const updateRoom = async (id: string, input: UpdateRoomInput) => {
  const profile = await ensurePropertyProfile();
  const existing = await roomsTable.getById(id);

  if (!existing || existing.hotelCode !== profile.hotelCode) {
    throw new HttpError(404, "Room not found");
  }

  let roomType = existing.roomTypeId ? await ensureRoomType(profile.hotelCode, existing.roomTypeId) : undefined;

  if (input.roomTypeId && input.roomTypeId !== existing.roomTypeId) {
    roomType = await ensureRoomType(profile.hotelCode, input.roomTypeId);
  }

  const floor = await ensureFloorForHotel(profile.hotelCode, input.floorId ?? existing.floorId);

  if (input.number && input.number.trim() !== existing.number.trim()) {
    const rooms = await listRooms();
    ensureUniqueRoomNumber(rooms, input.number, id);
  }

  if (input.status) {
    assertValidRoomStatusTransition(existing.status, input.status);
  }

  const updated = await roomsTable.update(id, {
    number: input.number ? input.number.trim() : existing.number,
    name: input.name ?? existing.name,
    type: roomType ? roomType.shortCode ?? normalizeCode(roomType.name) : existing.type,
    roomTypeId: roomType?.id ?? existing.roomTypeId,
    status: input.status ?? existing.status,
    rate: input.rate ?? existing.rate,
    floor: input.floor ?? floor?.number ?? existing.floor,
    floorId: floor?.id ?? existing.floorId,
    buildingId: input.buildingId ?? floor?.buildingId ?? existing.buildingId,
    amenities: input.amenities ? sanitizeAmenities(input.amenities) : (Array.isArray(existing.amenities) ? existing.amenities : DEFAULT_ROOM_AMENITIES),
    maxOccupancy: input.maxOccupancy ?? existing.maxOccupancy ?? 2,
    hasExtraBed: typeof input.hasExtraBed === "boolean" ? input.hasExtraBed : existing.hasExtraBed ?? false,
    isActive: input.isActive ?? existing.isActive ?? true,
    updatedAt: now()
  });

  return updated;
};

export const deleteRoom = async (id: string) => {
  const profile = await ensurePropertyProfile();
  const existing = await roomsTable.getById(id);

  if (!existing || existing.hotelCode !== profile.hotelCode) {
    throw new HttpError(404, "Room not found");
  }

  await roomsTable.delete(id);
};

export const listFloors = async () => {
  const profile = await ensurePropertyProfile();
  const records = await floorsTable.getAll();
  return records
    .filter((record) => record.hotelCode === profile.hotelCode)
    .map((record) => ({
      ...record,
      sortOrder: typeof record.sortOrder === "number" ? record.sortOrder : 0
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
};

export const createFloor = async (input: FloorInput) => {
  const profile = await ensurePropertyProfile();
  const floors = await listFloors();
  const duplicateNumber = floors.find((floor) => floor.number === input.number);

  if (duplicateNumber) {
    throw new HttpError(409, "Floor number already exists");
  }

  const timestamp = now();

  const record: Omit<FloorRecord, "id"> = {
    hotelId: profile.hotelId,
    hotelCode: profile.hotelCode,
    number: input.number,
    name: input.name,
    sortOrder: typeof input.sortOrder === "number" ? input.sortOrder : floors.length,
    buildingId: input.buildingId,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  return floorsTable.insert(record);
};

export const updateFloor = async (id: string, input: UpdateFloorInput) => {
  const profile = await ensurePropertyProfile();
  const existing = await floorsTable.getById(id);

  if (!existing || existing.hotelCode !== profile.hotelCode) {
    throw new HttpError(404, "Floor not found");
  }

  if (typeof input.number === "number" && input.number !== existing.number) {
    const floors = await listFloors();
    const duplicate = floors.find((floor) => floor.id !== id && floor.number === input.number);

    if (duplicate) {
      throw new HttpError(409, "Floor number already exists");
    }
  }

  const updated = await floorsTable.update(id, {
    number: input.number ?? existing.number,
    name: input.name ?? existing.name,
    sortOrder: typeof input.sortOrder === "number" ? input.sortOrder : existing.sortOrder ?? 0,
    buildingId: input.buildingId ?? existing.buildingId,
    updatedAt: now()
  });

  return updated;
};

export const deleteFloor = async (id: string) => {
  const profile = await ensurePropertyProfile();
  const existing = await floorsTable.getById(id);

  if (!existing || existing.hotelCode !== profile.hotelCode) {
    throw new HttpError(404, "Floor not found");
  }

  const rooms = await roomsTable.getAll();
  const roomsOnFloor = rooms.filter((room) => room.hotelCode === profile.hotelCode && room.floorId === id);

  if (roomsOnFloor.length > 0) {
    throw new HttpError(400, "Cannot delete floor while rooms are assigned");
  }

  await floorsTable.delete(id);
};

export const getTaxConfig = async (hotelCode?: string): Promise<TaxConfig | null> => {
  const code = hotelCode ?? (await ensurePropertyProfile()).hotelCode;
  const records = await taxesTable.getAll();
  const match = records.find((record) => record.hotelCode === code);

  if (!match) {
    return null;
  }

  return {
    ...match,
    gstEnabled: typeof match.gstEnabled === "boolean" ? match.gstEnabled : DEFAULT_TAX_VALUES.gstEnabled,
    cgst: typeof match.cgst === "number" ? match.cgst : DEFAULT_TAX_VALUES.cgst,
    sgst: typeof match.sgst === "number" ? match.sgst : DEFAULT_TAX_VALUES.sgst,
    igst: typeof match.igst === "number" ? match.igst : DEFAULT_TAX_VALUES.igst,
    serviceChargeEnabled:
      typeof match.serviceChargeEnabled === "boolean" ? match.serviceChargeEnabled : DEFAULT_TAX_VALUES.serviceChargeEnabled,
    serviceChargePercentage:
      typeof match.serviceChargePercentage === "number" ? match.serviceChargePercentage : DEFAULT_TAX_VALUES.serviceChargePercentage,
    luxuryTaxEnabled:
      typeof match.luxuryTaxEnabled === "boolean" ? match.luxuryTaxEnabled : DEFAULT_TAX_VALUES.luxuryTaxEnabled,
    luxuryTaxPercentage:
      typeof match.luxuryTaxPercentage === "number" ? match.luxuryTaxPercentage : DEFAULT_TAX_VALUES.luxuryTaxPercentage
  };
};

export const upsertTaxConfig = async (input: TaxConfigInput) => {
  const profile = await ensurePropertyProfile();
  const timestamp = now();
  const existing = await getTaxConfig();

  if (existing) {
    const updated = await taxesTable.update(existing.id, {
      gstEnabled: input.gstEnabled,
      cgst: input.cgst,
      sgst: input.sgst,
      igst: input.igst,
      serviceChargeEnabled: input.serviceChargeEnabled,
      serviceChargePercentage: input.serviceChargePercentage,
      luxuryTaxEnabled: input.luxuryTaxEnabled,
      luxuryTaxPercentage: input.luxuryTaxPercentage,
      updatedAt: timestamp
    });

    return updated;
  }

  const record: Omit<TaxConfig, "id"> = {
    hotelId: profile.hotelId,
    hotelCode: profile.hotelCode,
    gstEnabled: input.gstEnabled,
    cgst: input.cgst,
    sgst: input.sgst,
    igst: input.igst,
    serviceChargeEnabled: input.serviceChargeEnabled,
    serviceChargePercentage: input.serviceChargePercentage,
    luxuryTaxEnabled: input.luxuryTaxEnabled,
    luxuryTaxPercentage: input.luxuryTaxPercentage,
    updatedAt: timestamp
  };

  return taxesTable.insert(record);
};
