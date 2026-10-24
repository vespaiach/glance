import { NextRequest } from "next/server";
import { vi } from "vitest";
import { err, ok } from "@/domain/result";
import { GET } from "./route";

const services = vi.hoisted(() => ({ pushKey: vi.fn() }));

vi.mock("@/server/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/http")>()),
  syncReader: async () => ({ ok: true, value: { accountId: "a1", displayId: "d1" } }),
}));

vi.mock("@/server/services", () => services);

function get(): NextRequest {
  return new NextRequest("https://glance.example.com/api/push/key");
}

describe("GET /api/push/key", () => {
  it("D30 answers the VAPID public key", async () => {
    services.pushKey.mockReturnValue(ok("test-public-key"));

    const response = await GET(get());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ key: "test-public-key" });
  });

  it("D30 answers 404 while push is off", async () => {
    services.pushKey.mockReturnValue(err("push-off"));

    const response = await GET(get());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "push-off" });
  });
});
