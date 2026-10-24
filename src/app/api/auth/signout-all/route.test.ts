import { NextRequest } from "next/server";
import { vi } from "vitest";
import { err, ok } from "@/domain/result";
import { POST } from "./route";

const APP_URL = "https://glance.example.com";

const auth = vi.hoisted(() => ({ requireDisplay: vi.fn(), signOutAll: vi.fn() }));

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  appUrl: () => APP_URL,
  requireDisplay: auth.requireDisplay,
  signOutAll: auth.signOutAll,
}));

function post(origin = APP_URL): NextRequest {
  return new NextRequest(`${APP_URL}/api/auth/signout-all`, {
    method: "POST",
    headers: { origin, cookie: "session=kitchen-token" },
  });
}

beforeEach(() => {
  auth.requireDisplay.mockReset().mockResolvedValue(ok({ accountId: "a1", displayId: "d1" }));
  auth.signOutAll.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/auth/signout-all", () => {
  it("SIGNIN-11 signs out every device of the account, clears the cookie and answers 204", async () => {
    const response = await POST(post());

    expect(response.status).toBe(204);
    expect(auth.requireDisplay).toHaveBeenCalledWith("kitchen-token");
    expect(auth.signOutAll).toHaveBeenCalledWith("a1");
    expect(response.headers.get("set-cookie")).toMatch(/session=;/);
  });

  it("tech§6.1 refuses another origin", async () => {
    const response = await POST(post("https://evil.example.com"));

    expect(response.status).toBe(403);
    expect(auth.signOutAll).not.toHaveBeenCalled();
  });

  it("tech§6.1 answers 401 without a session", async () => {
    auth.requireDisplay.mockResolvedValue(err("unauthorized"));

    const response = await POST(post());

    expect(response.status).toBe(401);
    expect(auth.signOutAll).not.toHaveBeenCalled();
  });
});
