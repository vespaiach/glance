import { err, ok } from "@/domain/result";
import { databasePerTest } from "../db/testDb";
import type { Mailer, MailMessage } from "../mail/mailer";
import { requestCode, verifyCode } from "./codes";
import type { AuthDeps } from "./deps";
import { createRateLimiter } from "./rateLimit";
import { findDisplay, type SignedInDisplay } from "./sessions";

export const START = new Date("2026-10-09T14:00:00.000Z");

export const APP_URL = "https://glance.example.com";

const CODES = ["482913", "130577", "905162", "000731", "771204", "318640"];

export type AuthHarness = {
  deps: () => AuthDeps;
  sent: MailMessage[];
  advance: (ms: number) => void;
  failMail: () => void;
};

export function authHarnessPerTest(): AuthHarness {
  const db = databasePerTest();

  const sent: MailMessage[] = [];

  let clock = START;

  let failing = false;

  let codes = 0;

  let deps: AuthDeps | undefined;

  const mailer: Mailer = {
    send: async (message) => {
      if (failing) return err("mail-failed");

      sent.push(message);

      return ok(undefined);
    },
  };

  beforeEach(() => {
    sent.length = 0;
    clock = START;
    failing = false;
    codes = 0;
    deps = undefined;
  });

  return {
    deps: () => {
      deps ??= {
        db: db(),
        now: () => clock,
        mailer,
        appUrl: APP_URL,
        newCode: () => CODES[codes++ % CODES.length] ?? "",
        limits: {
          email: createRateLimiter({ limit: 5, windowMs: 600_000 }),
          ip: createRateLimiter({ limit: 20, windowMs: 600_000 }),
          qr: createRateLimiter({ limit: 30, windowMs: 3_600_000 }),
          guest: createRateLimiter({ limit: 20, windowMs: 600_000 }),
          verify: createRateLimiter({ limit: 30, windowMs: 600_000 }),
        },
      };

      return deps;
    },
    sent,
    advance: (ms) => {
      clock = new Date(clock.getTime() + ms);
    },
    failMail: () => {
      failing = true;
    },
  };
}

export function mailedCode(message: MailMessage | undefined): string {
  return message?.text.match(/\b\d{6}\b/)?.[0] ?? "";
}

export async function signIn(
  harness: AuthHarness,
  email: string,
  userAgent?: string,
): Promise<SignedInDisplay & { sessionToken: string }> {
  await requestCode(harness.deps(), { email, timeZone: "America/New_York", ip: "203.0.113.5" });

  const code = mailedCode(harness.sent.at(-1));

  const verified = await verifyCode(harness.deps(), { email, code, ip: "203.0.113.5", userAgent });

  if (!verified.ok) throw new Error(verified.error);

  const display = await findDisplay(harness.deps().db, verified.value.sessionToken);

  if (display === undefined) throw new Error("no display");

  return { ...display, sessionToken: verified.value.sessionToken };
}
