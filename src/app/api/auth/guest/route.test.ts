import { NextRequest } from "next/server";
import { vi } from "vitest";
import { err, ok } from "@/domain/result";
import { GET, POST } from "./route";

const APP_URL = "https://glance.example.com";

const auth = vi.hoisted(() => ({
  guestAvailable: vi.fn<() => Promise<boolean>>(),
  signInAsGuest: vi.fn(),
}));

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  appUrl: () => APP_URL,
  guestAvailable: auth.guestAvailable,
  signInAsGuest: auth.signInAsGuest,
}));

const GUEST = {
  state: "signed-in",
  account: { id: "a1", email: "guests@takeaglance.app", name: "Trinh" },
  returning: true,
  setupDone: true,
} as const;

function post(origin = APP_URL): NextRequest {
  return new NextRequest(`${APP_URL}/api/auth/guest`, {
    method: "POST",
    headers: { origin, "x-forwarded-for": "203.0.113.5", "user-agent": "Mozilla/5.0" },
  });
}

beforeEach(() => {
  auth.guestAvailable.mockReset();
  auth.signInAsGuest.mockReset();
});

describe("GET /api/auth/guest", () => {
  it("SIGNIN-16 answers 204 when guest sign-in is on", async () => {
    auth.guestAvailable.mockResolvedValue(true);

    expect((await GET()).status).toBe(204);
  });

  it("SIGNIN-16 answers 404 when guest sign-in is off", async () => {
    auth.guestAvailable.mockResolvedValue(false);

    expect((await GET()).status).toBe(404);
  });
});

describe("POST /api/auth/guest", () => {
  it("SIGNIN-16 signs in with a session cookie and answers the signed-in status", async () => {
    auth.signInAsGuest.mockResolvedValue(ok({ status: GUEST, sessionToken: "token" }));

    const response = await POST(post());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(GUEST);
    expect(response.cookies.get("session")?.value).toBe("token");
    expect(auth.signInAsGuest).toHaveBeenCalledWith({
      ip: "203.0.113.5",
      userAgent: "Mozilla/5.0",
    });
  });

  it("SIGNIN-16 answers 429 when the IP is over its limit", async () => {
    auth.signInAsGuest.mockResolvedValue(err("rate-limited"));

    const response = await POST(post());

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate-limited" });
  });

  it("SIGNIN-16 answers 404 when guest sign-in is off", async () => {
    auth.signInAsGuest.mockResolvedValue(err("not-found"));

    expect((await POST(post())).status).toBe(404);
  });

  it("tech§6.1 refuses another origin before signing in", async () => {
    const response = await POST(post("https://evil.example.com"));

    expect(response.status).toBe(403);
    expect(auth.signInAsGuest).not.toHaveBeenCalled();
  });
});
