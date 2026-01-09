import type { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      tgUser?: {
        id: number;
        first_name: string;
        last_name?: string;
        username?: string;
      };
      userId?: number;
    }
  }
}

export {};
