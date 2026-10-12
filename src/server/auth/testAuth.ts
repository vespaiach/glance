import { err, ok } from "@/domain/result";
import { migratedDbPerTest } from "../db/testDb";
import type { Mailer, MailMessage } from "../mail/mailer";
import type { AuthDeps } from "./deps";
import { createRateLimiter } from "./rateLimit";

export const START = new Date("2026-10-09T14:00:00.000Z");

export const APP_URL = "https://glance.example.com";

export type AuthHarness = {
  deps: () => AuthDeps;
  sent: MailMessage[];
  advance: (ms: number) => void;
  failMail: () => void;
};

export function authHarnessPerTest(): AuthHarness {
  const db = migratedDbPerTest();

  const sent: MailMessage[] = [];

  let clock = START;

  let failing = false;

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
    deps = undefined;
  });

  return {
    deps: () => {
      deps ??= {
        db: db(),
        now: () => clock,
        mailer,
        appUrl: APP_URL,
        limits: {
          email: createRateLimiter({ limit: 5, windowMs: 600_000 }),
          ip: createRateLimiter({ limit: 20, windowMs: 600_000 }),
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

export function linkToken(message: MailMessage | undefined): string {
  const match = message?.text.match(/\/api\/auth\/verify\?t=([\w-]+)/);

  return match?.[1] ?? "";
}
