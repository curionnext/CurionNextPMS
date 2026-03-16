export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "FRONT_DESK"
  | "HOUSEKEEPING"
  | "ACCOUNTING"
  | "POS";

export type AuthTokenPayload = {
  sub: string;
  hotelId: string;
  hotelCode: string;
  roles: Role[];
  userId?: string;
  iat?: number;
  exp?: number;
};
