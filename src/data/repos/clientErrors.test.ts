import { CLIENT_BUILD } from "@/domain/build";
import { createErrorReporter, type ErrorReporterDeps } from "./clientErrors";

function setup(overrides: Partial<ErrorReporterDeps> = {}) {
  const fetch = vi.fn(
    async (_url: string, _init: RequestInit) => new Response(null, { status: 204 }),
  );

  const events = new EventTarget();

  let online = true;

  const report = createErrorReporter({
    fetch: fetch as unknown as typeof globalThis.fetch,
    events,
    online: () => online,
    ...overrides,
  });

  const sent = () => fetch.mock.calls.map(([, init]) => JSON.parse(String(init.body)));

  const goOffline = () => {
    online = false;
  };

  const goOnline = () => {
    online = true;

    events.dispatchEvent(new Event("online"));
  };

  return { report, fetch, sent, goOffline, goOnline };
}

function thrown(message: string, line = 1) {
  const error = new TypeError(message);

  error.stack = `TypeError: ${message}\n    at today.js:${line}:5\n    at react.js:9:1`;

  return error;
}

describe("reportError", () => {
  it("tech§6.6 posts the error, page, build and component with keepalive", () => {
    const { report, fetch, sent } = setup({ page: () => "/today" });

    report("zone-crashed", thrown("boom"), { component: "TodaySchedule" });

    expect(fetch).toHaveBeenCalledWith(
      "/api/client-errors",
      expect.objectContaining({ method: "POST", keepalive: true }),
    );
    expect(sent()).toEqual([
      {
        event: "zone-crashed",
        error: { name: "TypeError", message: "boom", stack: thrown("boom").stack },
        page: "/today",
        build: CLIENT_BUILD,
        component: "TodaySchedule",
      },
    ]);
  });

  it("tech§6.6 sends no page from the worker", () => {
    const { report, sent } = setup();

    report("worker-crashed", thrown("boom"));

    expect(sent()[0]).not.toHaveProperty("page");
  });

  it("tech§6.6 reports the same error only once", () => {
    const { report, sent } = setup();

    report("uncaught", thrown("boom"));
    report("zone-crashed", thrown("boom"));
    report("uncaught", thrown("boom", 2));
    report("uncaught", thrown("other"));

    expect(sent().map((line) => line.error.message)).toEqual(["boom", "boom", "other"]);
  });

  it("tech§6.6 sends at most 20 reports", () => {
    const { report, fetch } = setup();

    for (let index = 0; index < 25; index += 1) report("uncaught", thrown(`boom ${index}`));

    expect(fetch).toHaveBeenCalledTimes(20);
  });

  it("tech§6.6 waits while offline and sends on online", () => {
    const { report, fetch, sent, goOffline, goOnline } = setup();

    goOffline();

    report("uncaught", thrown("boom"));

    expect(fetch).not.toHaveBeenCalled();

    goOnline();

    expect(sent().map((line) => line.error.message)).toEqual(["boom"]);

    goOnline();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("tech§6.6 turns a value that isn't an Error into a plain Error", () => {
    const { report, sent } = setup();

    report("uncaught", "quota exceeded");
    report("uncaught", { code: 7 });

    expect(sent().map((line) => line.error)).toEqual([
      { name: "Error", message: "quota exceeded" },
      { name: "Error", message: "[object Object]" },
    ]);
  });

  it("tech§6.6 cuts every text to the server's limits", () => {
    const { report, sent } = setup({ page: () => `/${"p".repeat(300)}` });

    const error = new Error("m".repeat(600));

    error.stack = "s".repeat(5000);

    report("uncaught", error, { component: "C".repeat(300) });

    const [line] = sent();

    expect(line.error.message).toHaveLength(500);
    expect(line.error.stack).toHaveLength(4000);
    expect(line.page).toHaveLength(200);
    expect(line.component).toHaveLength(200);
  });

  it("tech§6.6 never throws, even when sending fails", () => {
    const failing = vi.fn(() => {
      throw new Error("no network");
    });

    const { report } = setup({ fetch: failing as unknown as typeof globalThis.fetch });

    const rejecting = setup({
      fetch: vi.fn(async () => {
        throw new Error("offline");
      }) as unknown as typeof globalThis.fetch,
    });

    const hostile = {
      toString: () => {
        throw new Error("no string");
      },
    };

    expect(() => report("uncaught", thrown("boom"))).not.toThrow();
    expect(() => report("uncaught", hostile)).not.toThrow();
    expect(() => rejecting.report("uncaught", thrown("boom"))).not.toThrow();
  });
});
