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

const mocks = vi.hoisted(() => ({ requireDisplay: vi.fn(), undoImport: vi.fn() }));

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  appUrl: () => APP_URL,
  requireDisplay: mocks.requireDisplay,
}));

vi.mock("@/server/services", () => ({ undoImport: mocks.undoImport }));

function post(origin = APP_URL): [NextRequest, { params: Promise<{ id: string }> }] {
  const request = new NextRequest(`${APP_URL}/api/imports/${IMPORT_ID}/undo`, {
    method: "POST",
    headers: { origin, cookie: "session=token", [BUILD_HEADER]: String(CLIENT_BUILD) },
  });

  return [request, { params: Promise.resolve({ id: IMPORT_ID }) }];
}

beforeEach(() => {
  mocks.requireDisplay.mockReset();
  mocks.undoImport.mockReset();
  mocks.requireDisplay.mockResolvedValue(ok(MARIA));
});

describe("POST /api/imports/{id}/undo", () => {
  it("IMP-10 undo answers 204", async () => {
    mocks.undoImport.mockResolvedValue(ok({ version: 9 }));

    const response = await POST(...post());

    expect(response.status).toBe(204);
    expect(mocks.undoImport).toHaveBeenCalledWith(MARIA.accountId, IMPORT_ID);
  });

  it("IMP-10 undo after 24 h or when not done answers 409, an unknown import 404", async () => {
    mocks.undoImport.mockResolvedValueOnce(err("too-late"));
    mocks.undoImport.mockResolvedValueOnce(err("not-done"));
    mocks.undoImport.mockResolvedValueOnce(err("not-found"));

    expect((await POST(...post())).status).toBe(409);
    expect((await POST(...post())).status).toBe(409);
    expect((await POST(...post())).status).toBe(404);
  });

  it("tech§6.1 rejects a cross-origin POST", async () => {
    expect((await POST(...post("https://evil.example.com"))).status).toBe(403);
    expect(mocks.undoImport).not.toHaveBeenCalled();
  });
});
