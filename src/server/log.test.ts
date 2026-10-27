import { logError } from "./log";
import { spyOnLoggedErrors } from "./testLog";

const NOW = new Date("2026-10-26T14:03:11.482Z");

function rawLines(): () => string[] {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});

  onTestFinished(() => spy.mockRestore());

  return () => spy.mock.calls.map(([line]) => String(line));
}

function withFields<T extends Error>(error: T, fields: Record<string, unknown>): T {
  return Object.assign(error, fields);
}

describe("logError", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tech§6.6 writes one JSON line with level, time, source, event, the context, then the error", () => {
    const lines = rawLines();
    const error = new Error("Connection terminated unexpectedly");

    logError("route", "request-failed", error, { method: "PUT", route: "/api/events/[id]" });

    expect(lines()).toHaveLength(1);
    const line = JSON.parse(lines()[0] ?? "");
    expect(Object.keys(line)).toEqual([
      "level",
      "time",
      "source",
      "event",
      "method",
      "route",
      "error",
    ]);
    expect(line).toEqual({
      level: "error",
      time: "2026-10-26T14:03:11.482Z",
      source: "route",
      event: "request-failed",
      method: "PUT",
      route: "/api/events/[id]",
      error: { name: "Error", message: "Connection terminated unexpectedly", stack: error.stack },
    });
  });

  it("tech§6.6 copies only name, message, code and stack from the error", () => {
    const logged = spyOnLoggedErrors();
    const pgError = withFields(new Error("duplicate key value"), {
      code: "23505",
      detail: "Key (name)=(Maria) already exists.",
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      headers: { authorization: "vapid t=secret" },
      body: "provider answer",
    });

    logError("db", "pool-error", pgError);

    expect(logged()[0]?.error).toEqual({
      name: "Error",
      message: "duplicate key value",
      code: "23505",
      stack: pgError.stack,
    });
  });

  it("tech§6.6 follows the cause at most 2 levels deep", () => {
    const logged = spyOnLoggedErrors();
    const deepest = new Error("level 3");
    const error = new Error("level 0", {
      cause: new Error("level 1", { cause: new Error("level 2", { cause: deepest }) }),
    });

    logError("job", "job-failed", error, { job: "runHourly" });

    expect(logged()[0]?.error).toMatchObject({
      message: "level 0",
      cause: { message: "level 1", cause: { message: "level 2" } },
    });
    expect(JSON.stringify(logged()[0])).not.toContain("level 3");
  });

  it("tech§6.6 masks email addresses in the message and the stack", () => {
    const logged = spyOnLoggedErrors();
    const error = new Error("550 mailbox unavailable: maria.lopez+home@example.co.uk");

    logError("mail", "send-failed", error, { provider: "smtp" });

    const line = JSON.stringify(logged()[0]);
    expect(line).not.toContain("maria.lopez");
    expect(logged()[0]?.error).toMatchObject({
      message: "550 mailbox unavailable: [email]",
      stack: expect.stringContaining("550 mailbox unavailable: [email]"),
    });
  });

  it("tech§6.6 cuts the message at 500 characters", () => {
    const logged = spyOnLoggedErrors();

    logError("weather", "bad-response", new Error("x".repeat(800)), { host: "api.open-meteo.com" });

    expect(logged()[0]?.error).toMatchObject({ message: "x".repeat(500) });
  });

  it("tech§6.6 turns a string error into an Error with that message", () => {
    const logged = spyOnLoggedErrors();

    logError("boot", "start-failed", "DATABASE_URL is not set");

    expect(logged()[0]?.error).toEqual({ name: "Error", message: "DATABASE_URL is not set" });
  });

  it("tech§6.6 copies a reported error that is a plain object", () => {
    const logged = spyOnLoggedErrors();

    logError(
      "client",
      "zone-crashed",
      { name: "TypeError", message: "x is undefined", stack: "TypeError: x is undefined" },
      { page: "/today", build: 13, component: "TodaySchedule" },
    );

    expect(logged()[0]).toMatchObject({
      page: "/today",
      build: 13,
      component: "TodaySchedule",
      error: { name: "TypeError", message: "x is undefined", stack: "TypeError: x is undefined" },
    });
  });
});
