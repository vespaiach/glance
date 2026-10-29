import "server-only";
import type { Database } from "../db";
import type { Mailer } from "../mail/mailer";
import type { RateLimiter } from "./rateLimit";

export type AuthDeps = {
  db: Database;
  now: () => Date;
  mailer: Mailer;
  appUrl: string;
  newCode: () => string;
  limits: {
    email: RateLimiter;
    ip: RateLimiter;
    verify: RateLimiter;
    qr: RateLimiter;
    apiKey: RateLimiter;
  };
};

export type Clocked = Pick<AuthDeps, "db" | "now">;
