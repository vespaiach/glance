import { NextRequest } from "next/server";
import { vi } from "vitest";
import { BUILD_HEADER, CLIENT_BUILD } from "@/domain/build";
import { err, ok } from "@/domain/result";
import { POST } from "./route";

const APP_URL = "https://glance.example.com";

const MARIA = {
  accountId: "0192a000-0000-7000-8000-000000000001",
  displayId: "0192a000-0000-7000-8000-0000000000d1",
};

const IMPORT_ID = "0192a000-0000-7000-8000-0000000000i1";

const MOM = "0192a000-3333-7000-8000-000000000001";

const mocks = vi.hoisted(() => ({ requireDisplay: vi.fn(), commitImport: vi.fn() }));

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  appUrl: () => APP_URL,
  requireDisplay: mocks.requireDisplay,
}));

vi.mock("@/server/services", () => ({ commitImport: mocks.commitImport }));

function post(body: unknown, origin = APP_URL): [NextRequest, { params: Promise<{ id: string }> }] {
  const request = new NextRequest(`${APP_URL}/api/imports/${IMPORT_ID}/commit`, {
    method: "POST",
    headers: {
      origin,
      cookie: "session=token",
      [BUILD_HEADER]: String(CLIENT_BUILD),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return [request, { params: Promise.resolve({ id: IMPORT_ID }) }];
}

beforeEach(() => {
  mocks.requireDisplay.mockReset();
  mocks.commitImport.mockReset();
  mocks.requireDisplay.mockResolvedValue(ok(MARIA));
});

describe("POST /api/imports/{id}/commit", () => {
  it("IMP-08 commits for the picked who and answers the count, range and who", async () => {
    const range = { first: "2026-10-16", last: "2026-10-18" };
    mocks.commitImport.mockResolvedValue(ok({ count: 2, range, who: MOM, version: 7 }));

    const response = await POST(...post({ who: MOM }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 2, range, who: MOM });
    expect(mocks.commitImport).toHaveBeenCalledWith(MARIA.accountId, IMPORT_ID, MOM);
  });

  it("IMP-08 a second commit answers 409 and an unknown import 404", async () => {
    mocks.commitImport.mockResolvedValueOnce(err("not-staged"));
    mocks.commitImport.mockResolvedValueOnce(err("not-found"));

    expect((await POST(...post({ who: "everyone" }))).status).toBe(409);
    expect((await POST(...post({ who: "everyone" }))).status).toBe(404);
  });

  it("tech§6.1 rejects a who that is neither everyone nor an id, and a cross-origin POST", async () => {
    const bad = await POST(...post({ who: "mom" }));

    const foreign = await POST(...post({ who: "everyone" }, "https://evil.example.com"));

    expect(bad.status).toBe(400);
    expect(foreign.status).toBe(403);
    expect(mocks.commitImport).not.toHaveBeenCalled();
  });
});
