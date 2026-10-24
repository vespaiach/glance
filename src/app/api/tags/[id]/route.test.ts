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

const services = vi.hoisted(() => ({ putTag: vi.fn() }));

vi.mock("@/server/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/http")>()),
  syncWriter: async () => ({ ok: true, value: { accountId: "a1", displayId: "d1" } }),
}));

vi.mock("@/server/services", () => ({ putTag: services.putTag }));

function put(body: unknown, id = MOM.id): [NextRequest, { params: Promise<{ id: string }> }] {
  const request = new NextRequest(`${APP_URL}/api/tags/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  return [request, { params: Promise.resolve({ id }) }];
}

beforeEach(() => {
  services.putTag.mockReset();
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

  it("FAM-07 has no DELETE", () => {
    expect(route).not.toHaveProperty("DELETE");
  });
});
