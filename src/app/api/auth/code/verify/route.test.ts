import { NextRequest } from "next/server";
import { vi } from "vitest";
import { err, ok } from "@/domain/result";
import { POST } from "./route";

const APP_URL = "https://glance.example.com";

const auth = vi.hoisted(() => ({ verifyCode: vi.fn() }));

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  appUrl: () => APP_URL,
  verifyCode: auth.verifyCode,
}));

const BODY = { email: "maria@example.com", code: "482913" };

const SIGNED_IN = {
  state: "signed-in",
  account: { id: "a1", email: "maria@example.com", name: null },
  returning: false,
  setupDone: false,
} as const;

function post(body: unknown = BODY, origin = APP_URL): NextRequest {
  return new NextRequest(`${APP_URL}/api/auth/code/verify`, {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.5",
      "user-agent": "Mozilla/5.0",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  auth.verifyCode.mockReset();
});

describe("POST /api/auth/code/verify", () => {
  it("SIGNIN-12 signs in with a session cookie and answers the signed-in status", async () => {
    auth.verifyCode.mockResolvedValue(ok({ status: SIGNED_IN, sessionToken: "token" }));

    const response = await POST(post());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(SIGNED_IN);
    expect(response.cookies.get("session")?.value).toBe("token");
    expect(auth.verifyCode).toHaveBeenCalledWith({
      ...BODY,
      ip: "203.0.113.5",
      userAgent: "Mozilla/5.0",
    });
  });

  it.each(["wrong-code", "code-locked", "code-expired"])(
    "SIGNIN-17 answers 400 %s with no cookie",
    async (code) => {
      auth.verifyCode.mockResolvedValue(err(code));

      const response = await POST(post());

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: code });
      expect(response.cookies.get("session")).toBeUndefined();
    },
  );

  it("tech§6.2 answers 429 over the IP limit", async () => {
    auth.verifyCode.mockResolvedValue(err("rate-limited"));

    const response = await POST(post());

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate-limited" });
  });

  it.each([{ ...BODY, code: "48291" }, { ...BODY, code: "48291a" }, { code: "482913" }])(
    "tech§6.1 answers 400 invalid for a bad body %#",
    async (body) => {
      const response = await POST(post(body));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid" });
      expect(auth.verifyCode).not.toHaveBeenCalled();
    },
  );

  it("tech§6.1 refuses another origin", async () => {
    const response = await POST(post(BODY, "https://evil.example.com"));

    expect(response.status).toBe(403);
    expect(auth.verifyCode).not.toHaveBeenCalled();
  });
});
