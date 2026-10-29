import { NextRequest } from "next/server";
import { vi } from "vitest";
import { BUILD_HEADER, CLIENT_BUILD } from "@/domain/build";
import { FILE_NAME_HEADER } from "@/domain/photoUpload";
import { err, ok } from "@/domain/result";
import { POST } from "./route";

const APP_URL = "https://glance.example.com";

const MARIA = {
  accountId: "0192a000-0000-7000-8000-000000000001",
  displayId: "0192a000-0000-7000-8000-0000000000d1",
};

const PHONE_FOR = "0192a000-0000-7000-8000-0000000000d2";

const mocks = vi.hoisted(() => ({ requireDisplay: vi.fn(), stageImport: vi.fn() }));

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  appUrl: () => APP_URL,
  requireDisplay: mocks.requireDisplay,
}));

vi.mock("@/server/services", () => ({ stageImport: mocks.stageImport }));

type Upload = { text?: string; fileName?: string | null; forDisplay?: string; origin?: string };

function post({
  text = "BEGIN:VCALENDAR",
  fileName = "school.ics",
  forDisplay,
  origin = APP_URL,
}: Upload = {}): NextRequest {
  const query = forDisplay === undefined ? "" : `?forDisplay=${forDisplay}`;

  return new NextRequest(`${APP_URL}/api/imports${query}`, {
    method: "POST",
    headers: {
      origin,
      cookie: "session=token",
      [BUILD_HEADER]: String(CLIENT_BUILD),
      "content-type": "text/calendar",
      ...(fileName !== null && { [FILE_NAME_HEADER]: encodeURIComponent(fileName) }),
    },
    body: text,
  });
}

beforeEach(() => {
  mocks.requireDisplay.mockReset();
  mocks.stageImport.mockReset();
  mocks.requireDisplay.mockResolvedValue(ok(MARIA));
});

describe("POST /api/imports", () => {
  it("D39 stages the file for this screen, or the screen it was sent for, and answers the review", async () => {
    mocks.stageImport.mockResolvedValue(ok({ id: "i1", newCount: 1 }));

    const response = await POST(post({ fileName: "school year.ics", forDisplay: PHONE_FOR }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "i1", newCount: 1 });
    expect(mocks.stageImport).toHaveBeenCalledWith(MARIA.accountId, MARIA.displayId, {
      fileName: "school year.ics",
      text: "BEGIN:VCALENDAR",
      size: 15,
      forDisplay: PHONE_FOR,
    });
  });

  it("IMP-06 a .txt answers 400 not-ics", async () => {
    mocks.stageImport.mockResolvedValue(err("not-ics"));

    const response = await POST(post({ text: "Buy milk", fileName: "notes.txt" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "not-ics" });
  });

  it("IMP-06 a file over 5 MB answers 413 without being read", async () => {
    const response = await POST(post({ text: "x".repeat(5 * 1024 * 1024 + 1) }));

    expect(response.status).toBe(413);
    expect(mocks.stageImport).not.toHaveBeenCalled();
  });

  it("tech§6.1 rejects a cross-origin POST", async () => {
    const response = await POST(post({ origin: "https://evil.example.com" }));

    expect(response.status).toBe(403);
    expect(mocks.stageImport).not.toHaveBeenCalled();
  });

  it("tech§6.1 rejects a forDisplay that isn't an id, and an upload with no file name", async () => {
    const bad = await POST(post({ forDisplay: "wall" }));

    const empty = await POST(post({ fileName: null }));

    expect(bad.status).toBe(400);
    expect(empty.status).toBe(400);
    expect(mocks.stageImport).not.toHaveBeenCalled();
  });
});
