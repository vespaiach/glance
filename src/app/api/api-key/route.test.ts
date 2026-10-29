import { NextRequest } from "next/server";
import { vi } from "vitest";
import { BUILD_HEADER, CLIENT_BUILD } from "@/domain/build";
import { err, ok } from "@/domain/result";
import { DELETE, GET, POST } from "./route";

const APP_URL = "https://glance.example.com";

const MARIA = { accountId: "a1", displayId: "d1" };

const SHOWN = { tail: "x9Q2", createdAt: "2026-10-29T14:00:00.000Z", lastUsedAt: null };

const KEY = "glc_live_0123456789abcdefghijABCDEFGHx9Q2";

const mocks = vi.hoisted(() => ({
  requireDisplay: vi.fn(),
  apiKey: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
}));

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  appUrl: () => APP_URL,
  requireDisplay: mocks.requireDisplay,
}));

vi.mock("@/server/services", () => ({
  apiKey: mocks.apiKey,
  createApiKey: mocks.createApiKey,
  revokeApiKey: mocks.revokeApiKey,
}));

function call(method: string, origin = APP_URL): NextRequest {
  return new NextRequest(`${APP_URL}/api/api-key`, {
    method,
    headers: { origin, cookie: "session=token", [BUILD_HEADER]: String(CLIENT_BUILD) },
  });
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.requireDisplay.mockResolvedValue(ok(MARIA));
});

describe("GET /api/api-key", () => {
  it("SET-19 answers the masked key of the signed-in account", async () => {
    mocks.apiKey.mockResolvedValue(ok(SHOWN));

    const response = await GET(call("GET"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(SHOWN);
    expect(mocks.apiKey).toHaveBeenCalledWith("a1");
  });

  it("SET-19 answers 404 without a key", async () => {
    mocks.apiKey.mockResolvedValue(err("not-found"));

    expect((await GET(call("GET"))).status).toBe(404);
  });

  it("tech§6.1 answers 401 without a session", async () => {
    mocks.requireDisplay.mockResolvedValue(err("unauthorized"));

    expect((await GET(call("GET"))).status).toBe(401);
    expect(mocks.apiKey).not.toHaveBeenCalled();
  });
});

describe("POST /api/api-key", () => {
  it("SET-19 creates a key and answers it once with 201", async () => {
    mocks.createApiKey.mockResolvedValue(ok({ ...SHOWN, key: KEY }));

    const response = await POST(call("POST"));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ...SHOWN, key: KEY });
    expect(mocks.createApiKey).toHaveBeenCalledWith("a1");
  });

  it("SET-19 a second create is 409", async () => {
    mocks.createApiKey.mockResolvedValue(err("exists"));

    const response = await POST(call("POST"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "exists" });
  });

  it("tech§6.1 a cross-origin POST is rejected", async () => {
    const response = await POST(call("POST", "https://evil.example.com"));

    expect(response.status).toBe(403);
    expect(mocks.createApiKey).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/api-key", () => {
  it("SET-19 revokes the key and answers 204", async () => {
    mocks.revokeApiKey.mockResolvedValue(ok(undefined));

    const response = await DELETE(call("DELETE"));

    expect(response.status).toBe(204);
    expect(mocks.revokeApiKey).toHaveBeenCalledWith("a1");
  });

  it("SET-19 answers 404 without a key", async () => {
    mocks.revokeApiKey.mockResolvedValue(err("not-found"));

    expect((await DELETE(call("DELETE"))).status).toBe(404);
  });

  it("tech§6.1 a cross-origin DELETE is rejected", async () => {
    const response = await DELETE(call("DELETE", "https://evil.example.com"));

    expect(response.status).toBe(403);
    expect(mocks.revokeApiKey).not.toHaveBeenCalled();
  });
});
