import { NextRequest } from "next/server";
import { BUILD_HEADER, CLIENT_BUILD } from "@/domain/build";
import { FILE_MODIFIED_HEADER, FILE_NAME_HEADER } from "@/domain/photoUpload";
import { CalendarEventSchema } from "@/domain/schemas";
import {
  outdatedClient,
  readCoordinates,
  readCursor,
  readPlaceQuery,
  readRow,
  readUpload,
  readVariant,
} from "./http";

const URL_BASE = "https://glance.example.com/api/events/x";

const ID = "0192f3a0-1111-7000-8000-000000000001";

const EVENT = {
  id: ID,
  title: "Swim lesson",
  startAt: "2026-10-09T21:00:00.000Z",
  everyone: true,
  tagIds: [],
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

  it("tech§4.5 answers 426 to build 1, which still writes ambientHours", () => {
    expect(outdatedClient(request({ [BUILD_HEADER]: "1" }))?.status).toBe(426);
  });

  it("tech§4.5 answers 426 to build 2, which would write settings back without hideBarWhenIdle", () => {
    expect(outdatedClient(request({ [BUILD_HEADER]: "2" }))?.status).toBe(426);
  });

  it("D21 answers 426 to build 3, which would write all-day events back as timed ones", () => {
    expect(outdatedClient(request({ [BUILD_HEADER]: "3" }))?.status).toBe(426);
  });

  it("D22 answers 426 to build 4, which doesn't know a photo's sources", () => {
    expect(outdatedClient(request({ [BUILD_HEADER]: "4" }))?.status).toBe(426);
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

describe("readCursor", () => {
  function pull(query: string): NextRequest {
    return new NextRequest(`https://glance.example.com/api/sync${query}`);
  }

  it("SYNC-02 reads no cursor as a pull from scratch", () => {
    expect(readCursor(pull(""))).toEqual({ ok: true, value: undefined });
  });

  it("SYNC-02 reads the since version", () => {
    expect(readCursor(pull("?since=42"))).toEqual({ ok: true, value: 42 });
  });

  it.each(["?since=", "?since=abc", "?since=-1", "?since=1.5"])(
    "SYNC-02 rejects the cursor %s",
    (query) => {
      expect(readCursor(pull(query))).toEqual({ ok: false, error: "invalid" });
    },
  );
});

describe("readUpload", () => {
  function post(headers: Record<string, string>): NextRequest {
    return new NextRequest("https://glance.example.com/api/photos", {
      method: "POST",
      headers,
      body: "bytes",
    });
  }

  it("tech§6.3 reads the file name, type and declared size from the headers", () => {
    const upload = readUpload(
      post({
        [FILE_NAME_HEADER]: encodeURIComponent("Día de playa.jpg"),
        "content-type": "image/jpeg",
        "content-length": "5",
      }),
    );

    expect(upload).toMatchObject({
      ok: true,
      value: { name: "Día de playa.jpg", type: "image/jpeg", size: 5 },
    });
  });

  it("D22 reads the file's modified date", () => {
    const upload = readUpload(
      post({ [FILE_NAME_HEADER]: "a.jpg", [FILE_MODIFIED_HEADER]: "2026-08-16" }),
    );

    expect(upload).toMatchObject({ ok: true, value: { modifiedOn: "2026-08-16" } });
  });

  it("D22 reads an upload with no modified date", () => {
    const upload = readUpload(post({ [FILE_NAME_HEADER]: "a.jpg" }));

    expect(upload.ok && "modifiedOn" in upload.value).toBe(false);
  });

  it.each(["Aug 16", "2026-13-01", "2026-08-16T10:00:00Z", ""])(
    "D22 rejects a modified date %j that isn't a date",
    (modifiedOn) => {
      expect(
        readUpload(post({ [FILE_NAME_HEADER]: "a.jpg", [FILE_MODIFIED_HEADER]: modifiedOn })),
      ).toEqual({ ok: false, error: "invalid" });
    },
  );

  it("tech§6.3 rejects an upload with no file name", () => {
    expect(readUpload(post({ "content-type": "image/jpeg" }))).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("tech§6.3 rejects a file name that isn't URI-encoded", () => {
    expect(
      readUpload(post({ [FILE_NAME_HEADER]: "%E0%A4%A", "content-type": "image/jpeg" })),
    ).toEqual({
      ok: false,
      error: "invalid",
    });
  });
});

describe("readVariant", () => {
  function file(query: string): NextRequest {
    return new NextRequest(`https://glance.example.com/api/photos/x/file${query}`);
  }

  it.each(["display", "thumb", "orig"])("tech§6.3 reads the %s variant", (variant) => {
    expect(readVariant(file(`?v=${variant}`))).toEqual({ ok: true, value: variant });
  });

  it.each(["", "?v=", "?v=large"])("tech§6.3 rejects the variant query %s", (query) => {
    expect(readVariant(file(query))).toEqual({ ok: false, error: "invalid" });
  });
});

describe("readPlaceQuery", () => {
  function search(query: string): NextRequest {
    return new NextRequest(`https://glance.example.com/api/weather/places${query}`);
  }

  it("WX-07 reads the trimmed place query", () => {
    expect(readPlaceQuery(search("?q=%20Portland%2C%20OR%20"))).toEqual({
      ok: true,
      value: "Portland, OR",
    });
  });

  it("WX-04 refuses a missing or blank query", () => {
    expect(readPlaceQuery(search(""))).toEqual({ ok: false, error: "invalid" });
    expect(readPlaceQuery(search("?q=%20%20"))).toEqual({ ok: false, error: "invalid" });
  });
});

describe("readCoordinates", () => {
  function locate(query: string): NextRequest {
    return new NextRequest(`https://glance.example.com/api/weather/locate${query}`);
  }

  it("LOC-04 reads the position's latitude and longitude", () => {
    expect(readCoordinates(locate("?lat=45.51523&lon=-122.67836"))).toEqual({
      ok: true,
      value: { lat: 45.51523, lon: -122.67836 },
    });
  });

  it("LOC-04 refuses a missing, blank, non-numeric or out-of-range coordinate", () => {
    const refused = { ok: false, error: "invalid" };

    expect(readCoordinates(locate("?lat=45.5"))).toEqual(refused);
    expect(readCoordinates(locate("?lat=&lon=-122.6"))).toEqual(refused);
    expect(readCoordinates(locate("?lat=north&lon=-122.6"))).toEqual(refused);
    expect(readCoordinates(locate("?lat=91&lon=-122.6"))).toEqual(refused);
    expect(readCoordinates(locate("?lat=45.5&lon=181"))).toEqual(refused);
  });
});
