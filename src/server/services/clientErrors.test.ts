import type { ClientError } from "@/domain/schemas";
import { createRateLimiter } from "../auth/rateLimit";
import { spyOnLoggedErrors } from "../testLog";
import { type ClientErrorDeps, logClientError } from "./clientErrors";

const NOW = new Date("2026-10-26T14:07:42.120Z");

const MARIA = {
  accountId: "0192a000-0000-7000-8000-000000000001",
  displayId: "0192a000-0000-7000-8000-0000000000d1",
};

const OMAR_ACCOUNT = "0192a000-0000-7000-8000-000000000002";

const REPORT: ClientError = {
  event: "zone-crashed",
  error: {
    name: "TypeError",
    message: "Cannot read properties of undefined",
    stack: "TypeError: …",
  },
  page: "/today",
  build: 13,
  component: "TodaySchedule",
};

function setup() {
  let now = NOW;

  const deps: ClientErrorDeps = {
    limiter: createRateLimiter({ limit: 30, windowMs: 600_000 }),
    now: () => now,
  };

  const later = (ms: number) => {
    now = new Date(now.getTime() + ms);
  };

  return { deps, later, lines: spyOnLoggedErrors() };
}

describe("logClientError", () => {
  it("tech§6.6 logs the report as a client line with the session's ids", () => {
    const { deps, lines } = setup();

    expect(logClientError(deps, MARIA, REPORT)).toEqual({ ok: true, value: undefined });

    expect(lines()).toEqual([
      {
        level: "error",
        time: expect.any(String),
        source: "client",
        event: "zone-crashed",
        page: "/today",
        build: 13,
        component: "TodaySchedule",
        accountId: MARIA.accountId,
        displayId: MARIA.displayId,
        error: REPORT.error,
      },
    ]);
  });

  it("tech§6.6 ignores an account or display id in the body; the session's win", () => {
    const { deps, lines } = setup();

    const forged = { ...REPORT, accountId: OMAR_ACCOUNT, displayId: "omar-phone" } as ClientError;

    logClientError(deps, MARIA, forged);

    expect(lines()[0]).toMatchObject({ accountId: MARIA.accountId, displayId: MARIA.displayId });
  });

  it("tech§6.6 logs a signed-out report with no ids, and an id in the body is dropped", () => {
    const { deps, lines } = setup();

    const forged = { ...REPORT, accountId: OMAR_ACCOUNT } as ClientError;

    logClientError(deps, { ip: "203.0.113.5" }, forged);

    expect(lines()[0]).not.toHaveProperty("accountId");
    expect(lines()[0]).not.toHaveProperty("displayId");
    expect(lines()[0]).not.toHaveProperty("ip");
  });

  it("tech§6.6 allows 30 reports per 10 min per display", () => {
    const { deps, later, lines } = setup();

    for (let index = 0; index < 30; index += 1) logClientError(deps, MARIA, REPORT);

    expect(logClientError(deps, MARIA, REPORT)).toEqual({ ok: false, error: "rate-limited" });

    expect(logClientError(deps, { ...MARIA, displayId: "maria-tablet" }, REPORT).ok).toBe(true);

    later(600_000);

    expect(logClientError(deps, MARIA, REPORT).ok).toBe(true);
    expect(lines()).toHaveLength(32);
  });

  it("tech§6.6 limits signed-out reports per IP", () => {
    const { deps, lines } = setup();

    for (let index = 0; index < 30; index += 1) logClientError(deps, { ip: "203.0.113.5" }, REPORT);

    expect(logClientError(deps, { ip: "203.0.113.5" }, REPORT)).toEqual({
      ok: false,
      error: "rate-limited",
    });
    expect(logClientError(deps, { ip: "198.51.100.7" }, REPORT).ok).toBe(true);
    expect(lines()).toHaveLength(31);
  });
});
