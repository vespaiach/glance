import { NextRequest } from "next/server";
import { vi } from "vitest";
import { err, ok } from "@/domain/result";
import { DELETE } from "./route";

const APP_URL = "https://glance.example.com";

const auth = vi.hoisted(() => ({ requireDisplay: vi.fn(), deleteAccount: vi.fn() }));

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  appUrl: () => APP_URL,
  requireDisplay: auth.requireDisplay,
  deleteAccount: auth.deleteAccount,
}));

function remove(origin = APP_URL): NextRequest {
  return new NextRequest(`${APP_URL}/api/account`, {
    method: "DELETE",
    headers: { origin, cookie: "session=kitchen-token" },
  });
}

beforeEach(() => {
  auth.requireDisplay.mockReset().mockResolvedValue(ok({ accountId: "a1", displayId: "d1" }));
  auth.deleteAccount.mockReset().mockResolvedValue(undefined);
});

describe("DELETE /api/account", () => {
  it("SET-14 deletes the signed-in account, clears the cookie and answers 204", async () => {
    const response = await DELETE(remove());

    expect(response.status).toBe(204);
    expect(auth.requireDisplay).toHaveBeenCalledWith("kitchen-token");
    expect(auth.deleteAccount).toHaveBeenCalledWith("a1");
    expect(response.headers.get("set-cookie")).toMatch(/session=;/);
  });

  it("tech§6.1 refuses another origin", async () => {
    const response = await DELETE(remove("https://evil.example.com"));

    expect(response.status).toBe(403);
    expect(auth.deleteAccount).not.toHaveBeenCalled();
  });

  it("tech§6.1 answers 401 without a session", async () => {
    auth.requireDisplay.mockResolvedValue(err("unauthorized"));

    const response = await DELETE(remove());

    expect(response.status).toBe(401);
    expect(auth.deleteAccount).not.toHaveBeenCalled();
  });
});
