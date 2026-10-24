import { NextRequest } from "next/server";
import { vi } from "vitest";
import { ok } from "@/domain/result";
import * as route from "./route";

const APP_URL = "https://glance.example.com";

const SUBSCRIPTION = {
  endpoint: "https://push.example.com/phone",
  keys: { p256dh: "p256dh-key", auth: "auth-secret" },
};

const services = vi.hoisted(() => ({ subscribePush: vi.fn(), unsubscribePush: vi.fn() }));

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  appUrl: () => APP_URL,
  requireDisplay: async () => ok({ accountId: "a1", displayId: "d1" }),
}));

vi.mock("@/server/services", () => services);

function request(method: string, body?: unknown, origin = APP_URL): NextRequest {
  return new NextRequest(`${APP_URL}/api/push/subscription`, {
    method,
    headers: { origin, "x-glance-build": "99" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  services.subscribePush.mockReset();
  services.unsubscribePush.mockReset();
});

describe("PUT /api/push/subscription", () => {
  it("NOTIF-07 saves this display's subscription and answers 204", async () => {
    const response = await route.PUT(request("PUT", SUBSCRIPTION));

    expect(response.status).toBe(204);
    expect(services.subscribePush).toHaveBeenCalledWith("a1", "d1", SUBSCRIPTION);
  });

  it.each([
    ["no endpoint", { keys: SUBSCRIPTION.keys }],
    ["an http endpoint", { ...SUBSCRIPTION, endpoint: "http://push.example.com/phone" }],
    ["an endpoint that isn't a URL", { ...SUBSCRIPTION, endpoint: "phone" }],
    ["no auth key", { ...SUBSCRIPTION, keys: { p256dh: "p256dh-key" } }],
    ["an empty p256dh key", { ...SUBSCRIPTION, keys: { ...SUBSCRIPTION.keys, p256dh: "" } }],
  ])("tech§6.1 answers 400 for %s", async (_, body) => {
    expect((await route.PUT(request("PUT", body))).status).toBe(400);
    expect(services.subscribePush).not.toHaveBeenCalled();
  });

  it("tech§6.1 refuses another origin", async () => {
    const response = await route.PUT(request("PUT", SUBSCRIPTION, "https://evil.example.com"));

    expect(response.status).toBe(403);
    expect(services.subscribePush).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/push/subscription", () => {
  it("NOTIF-08 removes this display's subscription and answers 204", async () => {
    const response = await route.DELETE(request("DELETE"));

    expect(response.status).toBe(204);
    expect(services.unsubscribePush).toHaveBeenCalledWith("a1", "d1");
  });

  it("tech§6.1 refuses another origin", async () => {
    const response = await route.DELETE(request("DELETE", undefined, "https://evil.example.com"));

    expect(response.status).toBe(403);
    expect(services.unsubscribePush).not.toHaveBeenCalled();
  });
});
