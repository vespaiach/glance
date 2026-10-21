import { NextRequest } from "next/server";
import { vi } from "vitest";
import { err, ok } from "@/domain/result";
import { POST } from "./route";

const APP_URL = "https://glance.example.com";

const auth = vi.hoisted(() => ({ requestCode: vi.fn() }));

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  appUrl: () => APP_URL,
  requestCode: auth.requestCode,
}));

const BODY = { email: "maria@example.com", timeZone: "America/New_York" };

function post(body: unknown = BODY, origin = APP_URL): NextRequest {
  return new NextRequest(`${APP_URL}/api/auth/code`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", "x-forwarded-for": "203.0.113.5" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  auth.requestCode.mockReset();
});

describe("POST /api/auth/code", () => {
  it("SIGNIN-03 sends a code and answers 204 with no cookie", async () => {
    auth.requestCode.mockResolvedValue(ok(undefined));

    const response = await POST(post());

    expect(response.status).toBe(204);
    expect(response.cookies.getAll()).toEqual([]);
    expect(auth.requestCode).toHaveBeenCalledWith({ ...BODY, ip: "203.0.113.5" });
  });

  it("tech§6.2 answers 429 over the limits", async () => {
    auth.requestCode.mockResolvedValue(err("rate-limited"));

    const response = await POST(post());

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate-limited" });
  });

  it("SIGNIN-03 answers 502 when the email couldn't be sent", async () => {
    auth.requestCode.mockResolvedValue(err("mail-failed"));

    const response = await POST(post());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "mail-failed" });
  });

  it("tech§6.1 answers 400 for a bad email", async () => {
    const response = await POST(post({ ...BODY, email: "maria" }));

    expect(response.status).toBe(400);
    expect(auth.requestCode).not.toHaveBeenCalled();
  });

  it("tech§6.1 refuses another origin", async () => {
    const response = await POST(post(BODY, "https://evil.example.com"));

    expect(response.status).toBe(403);
    expect(auth.requestCode).not.toHaveBeenCalled();
  });
});
