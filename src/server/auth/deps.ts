import "server-only";
import type Database from "better-sqlite3";
import type { Mailer } from "../mail/mailer";
import type { RateLimiter } from "./rateLimit";

export type AuthDeps = {
  db: Database.Database;
  now: () => Date;
  mailer: Mailer;
  appUrl: string;
  limits: { email: RateLimiter; ip: RateLimiter };
};

export type Clocked = Pick<AuthDeps, "db" | "now">;
