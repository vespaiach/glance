import { NextRequest } from "next/server";
import { vi } from "vitest";
import { err, ok } from "@/domain/result";
import { DELETE, GET as GET_ONE, PATCH } from "./[id]/route";
import { GET, POST } from "./route";

const APP_URL = "https://glance.example.com";

const KEY = "glc_live_0123456789abcdefghijABCDEFGHx9Q2";

const EVENT = {
  id: "0192f3a0-1111-7000-8000-000000000001",
  title: "Swim lesson",
  start: "2026-10-12T19:00:00.000Z",
};

const mocks = vi.hoisted(() => ({
  requireApiKey: vi.fn(),
  listApiEvents: vi.fn(),
  readApiEvent: vi.fn(),
  createApiEvent: vi.fn(),
  changeApiEvent: vi.fn(),
  deleteApiEvent: vi.fn(),
}));

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  requireApiKey: mocks.requireApiKey,
}));

vi.mock("@/server/services", () => mocks);

function call(method: string, path = "", body?: unknown): NextRequest {
  return new NextRequest(`${APP_URL}/api/v1/events${path}`, {
    method,
    headers: { authorization: `Bearer ${KEY}` },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

const params = { params: Promise.resolve({ id: EVENT.id }) };

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.requireApiKey.mockResolvedValue(ok("a1"));
});

describe("API key guard", () => {
  it("API-01 answers 401 without a valid key and reads nothing", async () => {
    mocks.requireApiKey.mockResolvedValue(err({ error: "unauthorized" }));

    const response = await GET(call("GET"));

    expect(response.status).toBe(401);
    expect(mocks.listApiEvents).not.toHaveBeenCalled();
  });

  it("API-01 passes the Authorization header to the guard", async () => {
    mocks.listApiEvents.mockResolvedValue([]);

    await GET(call("GET"));

    expect(mocks.requireApiKey).toHaveBeenCalledWith(`Bearer ${KEY}`);
  });

  it("API-02 answers 429 with Retry-After when the key is limited", async () => {
    mocks.requireApiKey.mockResolvedValue(err({ error: "limited", retryAfterS: 40 }));

    const response = await POST(call("POST", "", { title: "Swim", start: EVENT.start }));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("40");
    expect(mocks.createApiEvent).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/events", () => {
  it("API-04 lists the key's events between from and to", async () => {
    mocks.listApiEvents.mockResolvedValue([EVENT]);

    const response = await GET(call("GET", "?from=2026-10-12&to=2026-10-18"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ events: [EVENT] });
    expect(mocks.listApiEvents).toHaveBeenCalledWith("a1", {
      from: "2026-10-12",
      to: "2026-10-18",
    });
  });

  it("API-04 rejects a malformed date or from after to", async () => {
    expect((await GET(call("GET", "?from=12-10-2026"))).status).toBe(400);
    expect((await GET(call("GET", "?from=2026-10-19&to=2026-10-18"))).status).toBe(400);
    expect(mocks.listApiEvents).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/events", () => {
  it("API-06 creates the event and answers 201 with its id", async () => {
    mocks.createApiEvent.mockResolvedValue(ok({ event: EVENT, version: 3 }));

    const response = await POST(call("POST", "", { title: " Swim lesson ", start: EVENT.start }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(EVENT);
    expect(mocks.createApiEvent).toHaveBeenCalledWith("a1", {
      title: "Swim lesson",
      start: EVENT.start,
    });
  });

  it("API-06 an invalid body answers 400 naming the field", async () => {
    const response = await POST(call("POST", "", { title: "Swim\nlesson", start: EVENT.start }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid", field: "title" });
    expect(mocks.createApiEvent).not.toHaveBeenCalled();
  });

  it("API-06 an unknown who name answers 400 naming who", async () => {
    mocks.createApiEvent.mockResolvedValue(err("who"));

    const response = await POST(call("POST", "", { ...EVENT, who: ["Grandpa"] }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid", field: "who" });
  });
});

describe("/api/v1/events/{id}", () => {
  it("API-05 answers one event, 404 when it isn't the key's", async () => {
    mocks.readApiEvent.mockResolvedValueOnce(ok(EVENT)).mockResolvedValueOnce(err("not-found"));

    expect(await (await GET_ONE(call("GET", `/${EVENT.id}`), params)).json()).toEqual(EVENT);
    expect((await GET_ONE(call("GET", `/${EVENT.id}`), params)).status).toBe(404);
  });

  it("API-07 patches only the given fields", async () => {
    mocks.changeApiEvent.mockResolvedValue(ok({ event: EVENT, version: 4 }));

    const response = await PATCH(call("PATCH", `/${EVENT.id}`, { place: null }), params);

    expect(response.status).toBe(200);
    expect(mocks.changeApiEvent).toHaveBeenCalledWith("a1", EVENT.id, { place: null });
  });

  it("API-08 deletes and answers 204, 404 when unknown", async () => {
    mocks.deleteApiEvent
      .mockResolvedValueOnce(ok({ version: 5 }))
      .mockResolvedValueOnce(err("not-found"));

    expect((await DELETE(call("DELETE", `/${EVENT.id}`), params)).status).toBe(204);
    expect((await DELETE(call("DELETE", `/${EVENT.id}`), params)).status).toBe(404);
  });
});
