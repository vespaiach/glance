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

const IPAD_SAFARI =
  "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

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

  it("tech§6.6 logs the digest and a service worker crash", () => {
    const { deps, lines } = setup();

    logClientError(deps, MARIA, { ...REPORT, event: "sw-crashed", digest: "1234567890" });

    expect(lines()[0]).toMatchObject({ event: "sw-crashed", digest: "1234567890" });
  });

  it("tech§6.6 logs the browser, device, user agent, masked IP, time zone and time", () => {
    const { deps, lines } = setup();

    const report = {
      ...REPORT,
      occurredAt: "2026-10-26T14:07:40.000Z",
      timeZone: "America/Chicago",
    };

    logClientError(deps, MARIA, report, { ip: "203.0.113.5", userAgent: IPAD_SAFARI });

    expect(lines()[0]).toMatchObject({
      occurredAt: "2026-10-26T14:07:40.000Z",
      timeZone: "America/Chicago",
      ip: "203.0.113.0",
      browser: "Safari",
      device: "tablet",
      userAgent: IPAD_SAFARI,
    });
  });

  it("tech§6.6 masks IPv4, IPv4-mapped and IPv6 addresses", () => {
    const { deps, lines } = setup();

    for (const ip of [
      "198.51.100.7",
      "::ffff:198.51.100.7",
      "2001:db8:85a3::8a2e:370:7334",
      "::1",
    ]) {
      logClientError(deps, { ip }, REPORT, { ip });
    }

    expect(lines().map((line) => line.ip)).toEqual([
      "198.51.100.0",
      "198.51.100.0",
      "2001:db8:85a3::",
      "0:0:0::",
    ]);
  });

  it("tech§6.6 cuts the user agent to 300 characters and logs no browser it doesn't know", () => {
    const { deps, lines } = setup();

    logClientError(deps, MARIA, REPORT, { userAgent: "x".repeat(400) });

    expect(lines()[0]?.userAgent).toHaveLength(300);
    expect(lines()[0]).toMatchObject({ device: "monitor" });
    expect(lines()[0]).not.toHaveProperty("browser");
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
