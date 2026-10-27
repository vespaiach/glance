import { NextRequest } from "next/server";
import { vi } from "vitest";
import { err, ok } from "@/domain/result";
import { POST } from "./route";

const APP_URL = "https://glance.example.com";

const MARIA = {
  accountId: "0192a000-0000-7000-8000-000000000001",
  displayId: "0192a000-0000-7000-8000-0000000000d1",
};

const mocks = vi.hoisted(() => ({ requireDisplay: vi.fn(), logClientError: vi.fn() }));

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  appUrl: () => APP_URL,
  requireDisplay: mocks.requireDisplay,
}));

vi.mock("@/server/services", () => ({ logClientError: mocks.logClientError }));

const REPORT = {
  event: "page-crashed",
  error: { name: "TypeError", message: "boom", stack: "TypeError: boom" },
  page: "/signin",
  build: 13,
};

function post(body: unknown = REPORT, { origin = APP_URL, cookie = "" } = {}): NextRequest {
  return new NextRequest(`${APP_URL}/api/client-errors`, {
    method: "POST",
    headers: {
      origin,
      cookie,
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.5",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.requireDisplay.mockReset();
  mocks.logClientError.mockReset();
  mocks.requireDisplay.mockResolvedValue(err("unauthorized"));
  mocks.logClientError.mockReturnValue(ok(undefined));
});

describe("POST /api/client-errors", () => {
  it("tech§6.6 logs a signed-out report by IP and answers 204", async () => {
    const response = await POST(post());

    expect(response.status).toBe(204);
    expect(mocks.logClientError).toHaveBeenCalledWith({ ip: "203.0.113.5" }, REPORT);
  });

  it("tech§6.6 logs a signed-in report with the session's ids, never the body's", async () => {
    mocks.requireDisplay.mockResolvedValue(ok(MARIA));

    const response = await POST(
      post({ ...REPORT, accountId: "someone-else" }, { cookie: "session=token" }),
    );

    expect(response.status).toBe(204);
    expect(mocks.requireDisplay).toHaveBeenCalledWith("token");
    expect(mocks.logClientError).toHaveBeenCalledWith(MARIA, REPORT);
  });

  it("tech§6.6 answers 204 when the report is rate limited, so the screen never retries", async () => {
    mocks.logClientError.mockReturnValue(err("rate-limited"));

    const response = await POST(post());

    expect(response.status).toBe(204);
  });

  it("tech§6.6 answers 400 for a bad body", async () => {
    const response = await POST(post({ ...REPORT, page: "today" }));

    const long = await POST(
      post({ ...REPORT, error: { name: "Error", message: "m".repeat(501) } }),
    );

    expect(response.status).toBe(400);
    expect(long.status).toBe(400);
    expect(mocks.logClientError).not.toHaveBeenCalled();
  });

  it("tech§6.1 refuses another origin", async () => {
    const response = await POST(post(REPORT, { origin: "https://evil.example.com" }));

    expect(response.status).toBe(403);
    expect(mocks.logClientError).not.toHaveBeenCalled();
  });
});
