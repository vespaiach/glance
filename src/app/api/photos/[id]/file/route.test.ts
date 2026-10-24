import { NextRequest } from "next/server";
import { vi } from "vitest";
import * as route from "./route";

const ID = "0192f3a0-1111-7000-8000-000000000001";

const services = vi.hoisted(() => ({ photoFile: vi.fn() }));

vi.mock("@/server/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/http")>()),
  signedInDisplay: async () => ({ ok: true, value: { accountId: "a1", displayId: "d1" } }),
}));

vi.mock("@/server/services", () => ({ photoFile: services.photoFile }));

function get(query: string): [NextRequest, { params: Promise<{ id: string }> }] {
  const request = new NextRequest(`https://glance.example.com/api/photos/${ID}/file${query}`);

  return [request, { params: Promise.resolve({ id: ID }) }];
}

describe("GET /api/photos/{id}/file", () => {
  it("D12 answers 400 for the original, which isn't kept", async () => {
    const response = await route.GET(...get("?v=orig"));

    expect(response.status).toBe(400);
    expect(services.photoFile).not.toHaveBeenCalled();
  });
});
