import "server-only";
import type { Db } from "../db/db";
import type { Mailer } from "../mail/mailer";
import type { RateLimiter } from "./rateLimit";

export type AuthDeps = {
  db: Db;
  now: () => Date;
  mailer: Mailer;
  appUrl: string;
  limits: { email: RateLimiter; ip: RateLimiter; qr: RateLimiter };
};

export type Clocked = Pick<AuthDeps, "db" | "now">;
