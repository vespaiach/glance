import { NextRequest } from "next/server";
import { BUILD_HEADER, CLIENT_BUILD } from "@/domain/build";
import { CalendarEventSchema } from "@/domain/schemas";
import { outdatedClient, readRow } from "./http";

const URL_BASE = "https://glance.example.com/api/events/x";

const ID = "0192f3a0-1111-7000-8000-000000000001";

const EVENT = {
  id: ID,
  title: "Swim lesson",
  startAt: "2026-10-09T21:00:00.000Z",
  tone: 2,
};

function request(headers: Record<string, string>, body?: unknown): NextRequest {
  return new NextRequest(URL_BASE, {
    method: "PUT",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("outdatedClient", () => {
  it("tech§4.5 lets a supported client build through", () => {
    expect(outdatedClient(request({ [BUILD_HEADER]: String(CLIENT_BUILD) }))).toBeUndefined();
  });

  it("tech§4.5 answers 426 outdated to a client without a supported build", async () => {
    const response = outdatedClient(request({}));

    expect(response?.status).toBe(426);
    expect(await response?.json()).toEqual({ error: "outdated" });
  });
});

describe("readRow", () => {
  it("tech§6.1 parses a row whose id matches the path", async () => {
    const row = await readRow(request({}, EVENT), CalendarEventSchema, ID);

    expect(row).toEqual({ ok: true, value: EVENT });
  });

  it("tech§6.1 drops the client's copy of the server fields", async () => {
    const row = await readRow(
      request({}, { ...EVENT, updatedAt: "2026-10-09T00:00:00.000Z", version: 7 }),
      CalendarEventSchema,
      ID,
    );

    expect(row).toEqual({ ok: true, value: EVENT });
  });

  it("tech§6.1 rejects a row whose id differs from the path", async () => {
    const row = await readRow(
      request({}, EVENT),
      CalendarEventSchema,
      "0192f3a0-1111-7000-8000-000000000002",
    );

    expect(row).toEqual({ ok: false, error: "invalid" });
  });

  it("TPK-07 rejects an event that ends before it starts", async () => {
    const row = await readRow(
      request({}, { ...EVENT, endAt: "2026-10-09T20:00:00.000Z" }),
      CalendarEventSchema,
      ID,
    );

    expect(row).toEqual({ ok: false, error: "invalid" });
  });

  it("tech§6.1 rejects a body that isn't JSON", async () => {
    const bad = new NextRequest(URL_BASE, { method: "PUT", body: "not json" });

    expect(await readRow(bad, CalendarEventSchema, ID)).toEqual({ ok: false, error: "invalid" });
  });
});
