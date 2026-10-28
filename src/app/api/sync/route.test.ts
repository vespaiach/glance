import { NextRequest } from "next/server";
import { vi } from "vitest";
import { GET } from "./route";

const APP_URL = "https://glance.example.com";

const services = vi.hoisted(() => ({ pullChanges: vi.fn() }));

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  appUrl: () => APP_URL,
}));

vi.mock("@/server/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/http")>()),
  syncReader: async () => ({ ok: true, value: { accountId: "a1", displayId: "d1" } }),
}));

vi.mock("@/server/services", () => services);

function get(): NextRequest {
  return new NextRequest(`${APP_URL}/api/sync`, { headers: { cookie: "session=token" } });
}

describe("GET /api/sync", () => {
  it("tech§6.2 renews the session cookie for another 400 days with each pull", async () => {
    services.pullChanges.mockResolvedValue({ cursor: 3, changes: [] });

    const response = await GET(get());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cursor: 3, changes: [] });
    expect(response.cookies.get("session")).toMatchObject({
      value: "token",
      maxAge: 400 * 24 * 60 * 60,
      httpOnly: true,
    });
  });
});
