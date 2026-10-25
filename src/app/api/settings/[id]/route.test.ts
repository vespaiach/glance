import { NextRequest } from "next/server";
import { vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { err, ok } from "@/domain/result";
import * as route from "./route";

const APP_URL = "https://glance.example.com";

const services = vi.hoisted(() => ({ putSettings: vi.fn() }));

vi.mock("@/server/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/http")>()),
  syncWriter: async () => ({ ok: true, value: { accountId: "a1", displayId: "d1" } }),
}));

vi.mock("@/server/services", () => services);

function put(body: unknown, id = "a1"): [NextRequest, { params: Promise<{ id: string }> }] {
  const request = new NextRequest(`${APP_URL}/api/settings/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  return [request, { params: Promise.resolve({ id }) }];
}

beforeEach(() => {
  services.putSettings.mockReset();
  services.putSettings.mockImplementation(async (_: string, __: string, settings: unknown) =>
    ok({ ...(settings as object), updatedAt: "2026-10-09T14:00:00.000Z", version: 1 }),
  );
});

describe("PUT /api/settings/{id}", () => {
  it.each(["off", 30] as const)("NOTIF-08 saves and answers the %s lead time", async (lead) => {
    const response = await route.PUT(...put({ ...DEFAULT_SETTINGS, notifyLead: lead }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ notifyLead: lead, version: 1 });
  });

  it("D29 saves an older client's settings with a default reminder as 15 min, dropping the reminder", async () => {
    const { notifyLead: _, ...older } = DEFAULT_SETTINGS;

    expect((await route.PUT(...put({ ...older, defaultReminder: "off" }))).status).toBe(200);

    expect(services.putSettings).toHaveBeenCalledWith("a1", "a1", DEFAULT_SETTINGS);
  });

  it("NOTIF-08 answers 400 for an unknown lead time", async () => {
    expect((await route.PUT(...put({ ...DEFAULT_SETTINGS, notifyLead: 60 }))).status).toBe(400);
    expect(services.putSettings).not.toHaveBeenCalled();
  });

  it("tech§6.1 answers 404 for another account's settings", async () => {
    services.putSettings.mockResolvedValue(err("not-found"));

    expect((await route.PUT(...put(DEFAULT_SETTINGS, "a2"))).status).toBe(404);
  });
});
