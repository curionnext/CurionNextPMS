import { HttpError } from "../middlewares/errorHandler.js";
import { generateToken } from "../utils/token.js";
import { verifyPassword } from "../utils/password.js";
import type { AuthTokenPayload, Role } from "../types/auth.js";
import {
  findByHotelCodeAndUsername,
  getUserById,
  toUserPayload,
  type UserPayload
} from "./userService.js";
import { endActiveShiftForUser, getActiveShiftForUser, startShift, type ShiftPayload } from "./shiftService.js";

export type LoginInput = {
  hotelCode: string;
  username: string;
  password: string;
  shiftName: string;
};

export type LoginResponse = {
  token: string;
  user: UserPayload;
  shift: ShiftPayload;
};

const ensureActiveStatus = (user: UserPayload) => {
  if (user.status !== "ACTIVE") {
    throw new HttpError(403, "User is inactive");
  }
};

export const login = async (input: LoginInput): Promise<LoginResponse> => {
  const userRecord = await findByHotelCodeAndUsername(input.hotelCode, input.username);

  if (!userRecord) {
    throw new HttpError(401, "Invalid credentials");
  }

  if (userRecord.status !== "ACTIVE") {
    throw new HttpError(403, "User is inactive");
  }

  const passwordMatches = await verifyPassword(input.password, userRecord.passwordHash);

  if (!passwordMatches) {
    throw new HttpError(401, "Invalid credentials");
  }

  const shift = await startShift({
    hotelId: userRecord.hotelId,
    hotelCode: userRecord.hotelCode,
    userId: userRecord.id,
    shiftName: input.shiftName
  });

  const payload: AuthTokenPayload = {
    sub: userRecord.id,
    hotelId: userRecord.hotelId,
    hotelCode: userRecord.hotelCode,
    roles: userRecord.roles as Role[]
  };

  const token = generateToken(payload);

  const user = toUserPayload(userRecord);

  ensureActiveStatus(user);

  return {
    token,
    user,
    shift
  };
};

export const logout = async (userId: string) => {
  const shift = await endActiveShiftForUser(userId);
  return shift;
};

export const getCurrentUser = async (userId: string): Promise<{ user: UserPayload; shift?: ShiftPayload }> => {
  const user = await getUserById(userId);

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  ensureActiveStatus(user);

  const shift = await getActiveShiftForUser(userId);

  return {
    user,
    shift
  };
};
