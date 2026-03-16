import type { AuthTokenPayload } from "./auth";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Request {
      user?: AuthTokenPayload;
      context?: {
        hotelId: string;
        hotelCode: string;
      };
    }
  }
}

export {};
