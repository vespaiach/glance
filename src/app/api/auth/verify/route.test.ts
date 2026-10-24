import { NextRequest } from "next/server";
import { vi } from "vitest";
import { err, ok } from "@/domain/result";
import { POST } from "./route";

const APP_URL = "https://glance.example.com";

const auth = vi.hoisted(() => ({ verifyQrLink: vi.fn() }));

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  appUrl: () => APP_URL,
  verifyQrLink: auth.verifyQrLink,
}));

const SIGNED_IN = {
  state: "signed-in",
  account: { id: "a1", email: "maria@example.com", name: "Maria" },
  returning: true,
  setupDone: true,
} as const;

function post(body: unknown = { t: "abc123" }, origin = APP_URL): NextRequest {
  return new NextRequest(`${APP_URL}/api/auth/verify`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", "user-agent": "Mozilla/5.0" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  auth.verifyQrLink.mockReset();
});

describe("POST /api/auth/verify", () => {
  it("SIGNIN-22 signs the scanner in with a session cookie and answers the signed-in status", async () => {
    auth.verifyQrLink.mockResolvedValue(ok({ status: SIGNED_IN, sessionToken: "token" }));

    const response = await POST(post());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(SIGNED_IN);
    expect(response.cookies.get("session")?.value).toBe("token");
    expect(auth.verifyQrLink).toHaveBeenCalledWith({ token: "abc123", userAgent: "Mozilla/5.0" });
  });

  it("SIGNIN-22 answers 400 link-stale with no cookie for a used or expired code", async () => {
    auth.verifyQrLink.mockResolvedValue(err("stale"));

    const response = await POST(post());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "link-stale" });
    expect(response.cookies.get("session")).toBeUndefined();
  });

  it.each([{}, { t: "" }, { t: 5 }])(
    "tech§6.1 answers 400 invalid for a bad body %#",
    async (body) => {
      const response = await POST(post(body));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid" });
      expect(auth.verifyQrLink).not.toHaveBeenCalled();
    },
  );

  it("tech§6.1 refuses another origin", async () => {
    const response = await POST(post({ t: "abc123" }, "https://evil.example.com"));

    expect(response.status).toBe(403);
    expect(auth.verifyQrLink).not.toHaveBeenCalled();
  });
});
