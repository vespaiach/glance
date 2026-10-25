import { NextRequest } from "next/server";
import { vi } from "vitest";
import { err, ok } from "@/domain/result";
import * as route from "./route";

const APP_URL = "https://glance.example.com";

const EVENT = {
  id: "0192f3a0-1111-7000-8000-000000000001",
  title: "Swim lesson",
  startAt: "2026-10-09T21:00:00.000Z",
  everyone: true,
  tagIds: [],
  notify: true,
};

const services = vi.hoisted(() => ({ putEvent: vi.fn(), deleteEvent: vi.fn() }));

vi.mock("@/server/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/http")>()),
  syncWriter: async () => ({ ok: true, value: { accountId: "a1", displayId: "d1" } }),
}));

vi.mock("@/server/services", () => services);

function put(body: unknown, id = EVENT.id): [NextRequest, { params: Promise<{ id: string }> }] {
  const request = new NextRequest(`${APP_URL}/api/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  return [request, { params: Promise.resolve({ id }) }];
}

beforeEach(() => {
  services.putEvent.mockReset();
  services.putEvent.mockImplementation(async (_: string, event: unknown) =>
    ok({ ...(event as object), updatedAt: "2026-10-09T14:00:00.000Z", version: 1 }),
  );
});

describe("PUT /api/events/{id}", () => {
  it("NOTIF-09 saves and answers the event's notification", async () => {
    const response = await route.PUT(...put({ ...EVENT, notify: false }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ notify: false, version: 1 });
    expect(services.putEvent).toHaveBeenCalledWith("a1", { ...EVENT, notify: false });
  });

  it("D29 saves an older client's event with a reminder and no notification, dropping the reminder", async () => {
    const { notify: _, ...older } = EVENT;

    expect((await route.PUT(...put({ ...older, reminder: "both" }))).status).toBe(200);

    expect(services.putEvent).toHaveBeenCalledWith("a1", older);
  });

  it("NOTIF-09 answers 400 for a notification that isn't on or off", async () => {
    expect((await route.PUT(...put({ ...EVENT, notify: "15min" }))).status).toBe(400);
    expect(services.putEvent).not.toHaveBeenCalled();
  });

  it("tech§6.1 answers 404 for another account's event", async () => {
    services.putEvent.mockResolvedValue(err("not-found"));

    expect((await route.PUT(...put(EVENT))).status).toBe(404);
  });
});
