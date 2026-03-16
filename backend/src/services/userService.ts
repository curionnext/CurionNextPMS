import { HttpError } from "../middlewares/errorHandler.js";
import prisma from "../db/prisma.js";
import { hashPassword } from "../utils/password.js";
import type { Role } from "../types/auth.js";
import type { UserStatus } from "../types/domain.js";

const now = () => new Date();

export type UserPayload = {
  id: string;
  hotelId: string;
  hotelCode: string;
  username: string;
  email: string;
  displayName: string;
  roles: Role[];
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserInput = {
  hotelId: string;
  hotelCode: string;
  username: string;
  email: string;
  displayName: string;
  password: string;
  roles: Role[];
  status?: UserStatus;
};

export type UpdateUserInput = Partial<{
  email: string;
  displayName: string;
  password: string;
  roles: Role[];
  status: UserStatus;
}>;

export const toUserPayload = (record: any): UserPayload => ({
  id: record.id,
  hotelId: record.hotelId,
  hotelCode: record.hotelCode,
  username: record.username,
  email: record.email,
  displayName: record.displayName,
  roles: record.roles as Role[],
  status: record.status as UserStatus,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString()
});

export const getUsers = async (hotelCode?: string) => {
  const records = await prisma.user.findMany({
    where: hotelCode ? { hotelCode: { equals: hotelCode, mode: 'insensitive' } } : {}
  });
  return records.map(toUserPayload);
};

export const getUserById = async (id: string) => {
  const record = await prisma.user.findUnique({
    where: { id }
  });

  if (!record) {
    return undefined;
  }

  return toUserPayload(record);
};

export const findByHotelCodeAndUsername = async (hotelCode: string, username: string) => {
  const record = await prisma.user.findUnique({
    where: {
      username: username // username is unique in schema
    }
  });

  // Note: If username is shared across hotels, the schema should have a composite index.
  // Currently, username is globally unique in my schema.prisma. 
  // If the user expects username to be unique ONLY per hotel, I should adjust.
  // Given the existing logic:
  if (record && record.hotelCode.toLowerCase() === hotelCode.toLowerCase()) {
    return record;
  }

  return undefined;
};

export const createUser = async (input: CreateUserInput) => {
  const existing = await findByHotelCodeAndUsername(input.hotelCode, input.username);

  if (existing) {
    throw new HttpError(409, "Username already exists for this hotel");
  }

  const passwordHash = await hashPassword(input.password);

  const inserted = await prisma.user.create({
    data: {
      hotelId: input.hotelId,
      hotelCode: input.hotelCode,
      username: input.username.toLowerCase(),
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      roles: input.roles,
      passwordHash,
      status: input.status ?? "ACTIVE"
    }
  });

  return toUserPayload(inserted);
};

export const updateUser = async (id: string, input: UpdateUserInput) => {
  const existing = await prisma.user.findUnique({ where: { id } });

  if (!existing) {
    throw new HttpError(404, "User not found");
  }

  let passwordHash = existing.passwordHash;

  if (input.password) {
    passwordHash = await hashPassword(input.password);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      email: input.email?.toLowerCase() ?? existing.email,
      displayName: input.displayName ?? existing.displayName,
      roles: input.roles ?? existing.roles,
      status: input.status ?? existing.status,
      passwordHash
    }
  });

  return toUserPayload(updated);
};
