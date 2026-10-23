import { NextRequest } from "next/server";
import { vi } from "vitest";
import { err, ok } from "@/domain/result";
import * as route from "./route";

const APP_URL = "https://glance.example.com";

const NOTE = {
  id: "0192f3a0-2222-7000-8000-000000000001",
  text: "Milk and eggs",
  author: "Maria",
  createdAt: "2026-10-09T13:00:00.000Z",
  rotation: -1.5,
};

const services = vi.hoisted(() => ({ putNote: vi.fn(), deleteNote: vi.fn() }));

vi.mock("@/server/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/http")>()),
  syncWriter: async () => ({ ok: true, value: { accountId: "a1", displayId: "d1" } }),
}));

vi.mock("@/server/services", () => services);

function put(body: unknown, id = NOTE.id): [NextRequest, { params: Promise<{ id: string }> }] {
  const request = new NextRequest(`${APP_URL}/api/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  return [request, { params: Promise.resolve({ id }) }];
}

beforeEach(() => {
  services.putNote.mockReset();
  services.putNote.mockImplementation(async (_: string, note: unknown) =>
    ok({ ...(note as object), updatedAt: "2026-10-09T14:00:00.000Z", version: 1 }),
  );
});

describe("PUT /api/notes/{id}", () => {
  it("SYNC-01 answers the stored note", async () => {
    const response = await route.PUT(...put(NOTE));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ...NOTE,
      updatedAt: "2026-10-09T14:00:00.000Z",
      version: 1,
    });
    expect(services.putNote).toHaveBeenCalledWith("a1", NOTE);
  });

  it("D27 ignores the tone an older client still sends", async () => {
    expect((await route.PUT(...put({ ...NOTE, tone: 3 }))).status).toBe(200);

    expect(services.putNote).toHaveBeenCalledWith("a1", NOTE);
  });

  it("NOTE-03 saves an unsigned note", async () => {
    expect((await route.PUT(...put({ ...NOTE, author: "" }))).status).toBe(200);

    expect(services.putNote).toHaveBeenCalledWith("a1", { ...NOTE, author: "" });
  });

  it("NOTE-02 accepts a 280-character message from a 32-character author", async () => {
    const full = { ...NOTE, text: "a".repeat(280), author: "b".repeat(32) };

    expect((await route.PUT(...put(full))).status).toBe(200);
  });

  it.each([
    ["a message over 280 characters", { text: "a".repeat(281) }],
    ["an author over 32 characters", { author: "b".repeat(33) }],
    ["an empty message", { text: "  " }],
  ])("NOTE-02 answers 400 for %s", async (_, change) => {
    expect((await route.PUT(...put({ ...NOTE, ...change }))).status).toBe(400);
    expect(services.putNote).not.toHaveBeenCalled();
  });

  it("tech§6.1 answers 404 for another account's note", async () => {
    services.putNote.mockResolvedValue(err("not-found"));

    expect((await route.PUT(...put(NOTE))).status).toBe(404);
  });
});
