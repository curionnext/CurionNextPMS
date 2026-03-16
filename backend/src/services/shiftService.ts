import { HttpError } from "../middlewares/errorHandler.js";
import prisma from "../db/prisma.js";

const now = () => new Date();

export type ShiftPayload = {
  id: string;
  hotelId: string;
  hotelCode: string;
  userId: string;
  shiftName: string;
  startedAt: string;
  endedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StartShiftInput = {
  hotelId: string;
  hotelCode: string;
  userId: string;
  shiftName: string;
};

const toPayload = (record: any): ShiftPayload => ({
  id: record.id,
  hotelId: record.hotelId,
  hotelCode: record.hotelCode,
  userId: record.userId,
  shiftName: record.shiftName,
  startedAt: record.startedAt.toISOString(),
  endedAt: record.endedAt?.toISOString(),
  isActive: record.isActive,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString()
});

export const getActiveShiftForUser = async (userId: string) => {
  const active = await prisma.shift.findFirst({
    where: { userId, isActive: true }
  });
  return active ? toPayload(active) : undefined;
};

export const getActiveShifts = async (hotelCode?: string) => {
  const records = await prisma.shift.findMany({
    where: { 
      isActive: true,
      ...(hotelCode ? { hotelCode: { equals: hotelCode, mode: 'insensitive' } } : {})
    }
  });
  return records.map(toPayload);
};

export const startShift = async (input: StartShiftInput) => {
  // End any existing active shift for this user
  await prisma.shift.updateMany({
    where: { userId: input.userId, isActive: true },
    data: {
      isActive: false,
      endedAt: now()
    }
  });

  const inserted = await prisma.shift.create({
    data: {
      hotelId: input.hotelId,
      hotelCode: input.hotelCode,
      userId: input.userId,
      shiftName: input.shiftName,
      isActive: true
    }
  });

  return toPayload(inserted);
};

export const endShiftById = async (shiftId: string) => {
  const record = await prisma.shift.findUnique({ where: { id: shiftId } });

  if (!record) {
    throw new HttpError(404, "Shift not found");
  }

  if (!record.isActive) {
    return toPayload(record);
  }

  const updated = await prisma.shift.update({
    where: { id: shiftId },
    data: {
      isActive: false,
      endedAt: now()
    }
  });

  return toPayload(updated);
};

export const endActiveShiftForUser = async (userId: string) => {
  const active = await getActiveShiftForUser(userId);

  if (!active) {
    return undefined;
  }

  return endShiftById(active.id);
};