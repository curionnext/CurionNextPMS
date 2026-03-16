import { HttpError } from "../middlewares/errorHandler.js";
import { db } from "../db/index.js";
import { ensureRoomAvailable, ensureRoomBelongsToHotel, getReservationById, nightsBetween } from "./reservationService.js";
import { addGuestIdDocument, getGuestById } from "./guestService.js";
import type { GuestIdDocument } from "../types/domain.js";
import { settleReservation } from "./billingService.js";

const reservationsTable = db.reservations;
const roomsTable = db.rooms;

const now = () => new Date().toISOString();

const getReservationOrThrow = async (reservationId: string) => {
  const reservation = await reservationsTable.getById(reservationId);

  if (!reservation) {
    throw new HttpError(404, "Reservation not found");
  }

  return reservation;
};

const getRoomOrThrow = async (roomId: string) => {
  const room = await roomsTable.getById(roomId);

  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  return room;
};

export const assignRoom = async (reservationId: string, roomId: string) => {
  const reservation = await getReservationOrThrow(reservationId);
  const room = await getRoomOrThrow(roomId);

  ensureRoomBelongsToHotel(room, reservation.hotelCode);
  await ensureRoomAvailable(room.id, reservation.arrivalDate, reservation.departureDate, reservation.id);

  await reservationsTable.update(reservation.id, {
    roomId: room.id,
    roomType: room.type,
    updatedAt: now()
  });

  const payload = await getReservationById(reservation.id);

  if (!payload) {
    throw new HttpError(500, "Unable to load updated reservation");
  }

  return payload;
};

export type GuestIdDocumentInput = Omit<GuestIdDocument, "capturedAt"> & { capturedAt?: string };

export const captureGuestId = async (guestId: string, document: GuestIdDocumentInput) => {
  const guest = await getGuestById(guestId);

  if (!guest) {
    throw new HttpError(404, "Guest not found");
  }

  const payload = await addGuestIdDocument(guestId, {
    ...document,
    capturedAt: document.capturedAt ?? now()
  });

  return payload;
};

export type CheckInInput = {
  reservationId: string;
  roomId?: string;
};

export const checkIn = async (input: CheckInInput) => {
  const reservation = await getReservationOrThrow(input.reservationId);

  if (!["CONFIRMED", "DRAFT"].includes(reservation.status)) {
    throw new HttpError(400, "Reservation cannot be checked in from current status");
  }

  const roomId = input.roomId ?? reservation.roomId;

  if (!roomId) {
    throw new HttpError(400, "Room assignment is required for check-in");
  }

  const room = await getRoomOrThrow(roomId);
  ensureRoomBelongsToHotel(room, reservation.hotelCode);
  await ensureRoomAvailable(room.id, reservation.arrivalDate, reservation.departureDate, reservation.id);

  const timestamp = now();

  const previousReservation = { ...reservation };
  await reservationsTable.update(reservation.id, {
    status: "CHECKED_IN",
    roomId: room.id,
    roomType: room.type,
    checkInAt: timestamp,
    updatedAt: timestamp
  });

  try {
    await roomsTable.update(room.id, { status: "OCCUPIED", updatedAt: timestamp });
  } catch (error) {
    await reservationsTable.update(reservation.id, previousReservation);
    throw error;
  }

  const payload = await getReservationById(reservation.id);

  if (!payload) {
    throw new HttpError(500, "Unable to load updated reservation");
  }

  return payload;
};

export type CheckOutInput = {
  reservationId: string;
  lateCheckout?: boolean;
  extraCharges?: { description: string; amount: number }[];
};

export const checkOut = async (input: CheckOutInput) => {
  const reservation = await getReservationOrThrow(input.reservationId);

  if (reservation.status !== "CHECKED_IN") {
    throw new HttpError(400, "Reservation is not currently checked in");
  }

  if (!reservation.roomId) {
    throw new HttpError(400, "Reservation does not have an assigned room");
  }

  const room = await getRoomOrThrow(reservation.roomId);

  const nights = nightsBetween(reservation.arrivalDate, reservation.departureDate);

  const settlement = await settleReservation(reservation, {
    lateCheckout: input.lateCheckout,
    extraCharges: input.extraCharges
  });

  const timestamp = now();

  const previousReservation = { ...reservation };
  await reservationsTable.update(reservation.id, {
    status: "CHECKED_OUT",
    checkOutAt: timestamp,
    billing: settlement.billing,
    updatedAt: timestamp
  });

  try {
    await roomsTable.update(room.id, { status: "DIRTY", updatedAt: timestamp });
  } catch (error) {
    await reservationsTable.update(reservation.id, previousReservation);
    throw error;
  }

  const payload = await getReservationById(reservation.id);

  if (!payload) {
    throw new HttpError(500, "Unable to load updated reservation");
  }

  return {
    reservation: payload,
    settlement,
    nights
  };
};
