import { NextRequest } from "next/server";
import { vi } from "vitest";
import { err, ok } from "@/domain/result";
import * as route from "./route";

const APP_URL = "https://glance.example.com";

const MOM = {
  id: "0192f3a0-3333-7000-8000-000000000001",
  name: "Mom",
  color: "coral",
  createdAt: "2026-10-01T15:00:00.000Z",
} as const;

const services = vi.hoisted(() => ({ putTag: vi.fn(), removeTag: vi.fn() }));

const auth = vi.hoisted(() => ({ requireDisplay: vi.fn() }));

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  appUrl: () => APP_URL,
  requireDisplay: auth.requireDisplay,
}));

vi.mock("@/server/services", () => services);

type Call = [NextRequest, { params: Promise<{ id: string }> }];

function call(method: string, body?: unknown, id = MOM.id, origin = APP_URL): Call {
  const request = new NextRequest(`${APP_URL}/api/tags/${id}`, {
    method,
    headers: { origin, cookie: "session=kitchen-token", "x-glance-build": "99" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  return [request, { params: Promise.resolve({ id }) }];
}

function put(body: unknown, id = MOM.id): Call {
  return call("PUT", body, id);
}

function remove(origin = APP_URL): Call {
  return call("DELETE", undefined, MOM.id, origin);
}

beforeEach(() => {
  services.putTag.mockReset();
  services.removeTag.mockReset();
  auth.requireDisplay.mockReset().mockResolvedValue(ok({ accountId: "a1", displayId: "d1" }));
});

describe("PUT /api/tags/{id}", () => {
  it("D24 answers the stored tag", async () => {
    const stored = { ...MOM, updatedAt: "2026-10-09T14:00:00.000Z", version: 1 };
    services.putTag.mockResolvedValue(ok(stored));

    const response = await route.PUT(...put(MOM));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(stored);
    expect(services.putTag).toHaveBeenCalledWith("a1", MOM);
  });

  it("FAM-07 answers 409 for a rename or recolor", async () => {
    services.putTag.mockResolvedValue(err("tag-changed"));

    const response = await route.PUT(...put(MOM));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "tag-changed" });
  });

  it("tech§6.1 answers 404 for another account's tag", async () => {
    services.putTag.mockResolvedValue(err("not-found"));

    expect((await route.PUT(...put(MOM))).status).toBe(404);
  });

  it("tech§6.1 answers 400 for a body that isn't a tag", async () => {
    expect((await route.PUT(...put({ ...MOM, color: "navy" }))).status).toBe(400);
    expect(services.putTag).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/tags/{id}", () => {
  const removed = {
    ...MOM,
    updatedAt: "2026-10-09T14:00:00.000Z",
    deletedAt: "2026-10-09T14:00:00.000Z",
    version: 4,
  };

  it("FAM-08 removes the tag and answers the stored tombstone", async () => {
    services.removeTag.mockResolvedValue(ok(removed));

    const response = await route.DELETE(...remove());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(removed);
    expect(services.removeTag).toHaveBeenCalledWith("a1", MOM.id);
  });

  it("FAM-08 answers 409 for the last tag", async () => {
    services.removeTag.mockResolvedValue(err("last-tag"));

    const response = await route.DELETE(...remove());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "last-tag" });
  });

  it("tech§6.1 answers 404 for another account's tag", async () => {
    services.removeTag.mockResolvedValue(err("not-found"));

    expect((await route.DELETE(...remove())).status).toBe(404);
  });

  it("tech§6.1 answers 401 without a session", async () => {
    auth.requireDisplay.mockResolvedValue(err("unauthorized"));

    expect((await route.DELETE(...remove())).status).toBe(401);
    expect(services.removeTag).not.toHaveBeenCalled();
  });

  it("tech§6.1 refuses another origin", async () => {
    expect((await route.DELETE(...remove("https://evil.example.com"))).status).toBe(403);
    expect(services.removeTag).not.toHaveBeenCalled();
  });
});
