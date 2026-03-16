import { HttpError } from "../middlewares/errorHandler.js";
import { db } from "../db/index.js";
import type { GuestIdDocument, GuestRecord } from "../types/domain.js";

const guestsTable = db.guests;

const now = () => new Date().toISOString();

export type GuestPayload = {
  id: string;
  hotelId: string;
  hotelCode: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  preferences?: string[];
  tags?: string[];
  notes?: string;
  visitCount: number;
  stayHistory: string[];
  idDocuments: GuestIdDocument[];
  createdAt: string;
  updatedAt: string;
};

export type CreateGuestInput = {
  hotelId: string;
  hotelCode: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  preferences?: string[];
  tags?: string[];
  notes?: string;
};

export type UpdateGuestInput = Partial<CreateGuestInput> & {
  preferences?: string[];
  tags?: string[];
  notes?: string;
};

const toPayload = (guest: GuestRecord): GuestPayload => ({
  id: guest.id,
  hotelId: guest.hotelId,
  hotelCode: guest.hotelCode,
  firstName: guest.firstName,
  lastName: guest.lastName,
  email: guest.email,
  phone: guest.phone,
  addressLine1: guest.addressLine1,
  addressLine2: guest.addressLine2,
  city: guest.city,
  state: guest.state,
  country: guest.country,
  postalCode: guest.postalCode,
  preferences: guest.preferences,
  tags: guest.tags,
  notes: guest.notes,
  visitCount: guest.visitCount,
  stayHistory: guest.stayHistory,
  idDocuments: guest.idDocuments,
  createdAt: guest.createdAt,
  updatedAt: guest.updatedAt
});

export const getGuests = async (hotelCode?: string) => {
  const records = await guestsTable.getAll();
  const filtered = hotelCode ? records.filter((guest) => guest.hotelCode === hotelCode) : records;
  return filtered.map(toPayload);
};

export const getGuestById = async (id: string) => {
  const record = await guestsTable.getById(id);
  return record ? toPayload(record) : undefined;
};

export const createGuest = async (input: CreateGuestInput) => {
  const timestamp = now();
  const record: Omit<GuestRecord, "id"> = {
    hotelId: input.hotelId,
    hotelCode: input.hotelCode,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    city: input.city,
    state: input.state,
    country: input.country,
    postalCode: input.postalCode,
    preferences: input.preferences ?? [],
    tags: input.tags ?? [],
    notes: input.notes,
    visitCount: 0,
    stayHistory: [],
    idDocuments: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const inserted = await guestsTable.insert(record);
  return toPayload(inserted);
};

export const updateGuest = async (id: string, input: UpdateGuestInput) => {
  const existing = await guestsTable.getById(id);

  if (!existing) {
    throw new HttpError(404, "Guest not found");
  }

  const updated = await guestsTable.update(id, {
    firstName: input.firstName ?? existing.firstName,
    lastName: input.lastName ?? existing.lastName,
    email: input.email ?? existing.email,
    phone: input.phone ?? existing.phone,
    addressLine1: input.addressLine1 ?? existing.addressLine1,
    addressLine2: input.addressLine2 ?? existing.addressLine2,
    city: input.city ?? existing.city,
    state: input.state ?? existing.state,
    country: input.country ?? existing.country,
    postalCode: input.postalCode ?? existing.postalCode,
    preferences: input.preferences ?? existing.preferences,
    tags: input.tags ?? existing.tags,
    notes: input.notes ?? existing.notes,
    updatedAt: now()
  });

  return toPayload(updated);
};

export const recordGuestStay = async (guestId: string, reservationId: string) => {
  const existing = await guestsTable.getById(guestId);

  if (!existing) {
    throw new HttpError(404, "Guest not found");
  }

  if (!existing.stayHistory.includes(reservationId)) {
    await guestsTable.update(guestId, {
      stayHistory: [...existing.stayHistory, reservationId],
      visitCount: existing.visitCount + 1,
      updatedAt: now()
    });
  }
};

export const addGuestIdDocument = async (guestId: string, document: GuestIdDocument) => {
  const existing = await guestsTable.getById(guestId);

  if (!existing) {
    throw new HttpError(404, "Guest not found");
  }

  existing.idDocuments.push(document);
  existing.updatedAt = now();

  await guestsTable.update(guestId, existing);

  return toPayload(existing);
};
