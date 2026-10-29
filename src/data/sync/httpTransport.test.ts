import { BUILD_HEADER, CLIENT_BUILD } from "@/domain/build";
import { FILE_MODIFIED_HEADER, FILE_NAME_HEADER, MAX_PHOTO_BYTES } from "@/domain/photoUpload";
import type { OutboxEntry } from "../db";
import { createHttpTransport } from "./httpTransport";

type Call = { url: string; init: RequestInit };

const NOTE_ROW = { id: "n1", text: "Milk", tone: 2, version: 7 };

const PHOTO_ROW = { id: "p1", title: "beach", version: 9 };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fakeFetch(...answers: (Response | Error)[]) {
  const calls: Call[] = [];

  const fetch = async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });

    const answer = answers.shift() ?? json(null);

    if (answer instanceof Error) throw answer;

    return answer;
  };

  return { calls, fetch: fetch as typeof globalThis.fetch };
}

function headersOf(call: Call | undefined): Headers {
  return new Headers(call?.init.headers);
}

class FakeXhr {
  static last: FakeXhr | undefined;

  method = "";
  url = "";
  headers: Record<string, string> = {};
  body: unknown;
  status = 0;
  responseText = "";
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  ontimeout: (() => void) | null = null;

  constructor() {
    FakeXhr.last = this;
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
  }

  send(body: unknown) {
    this.body = body;
  }

  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total } as ProgressEvent);
  }

  answer(status: number, body: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(body);
    this.onload?.();
  }
}

function sentXhr(): FakeXhr {
  if (FakeXhr.last === undefined) throw new Error("no request was sent");

  return FakeXhr.last;
}

function transport(fetch: typeof globalThis.fetch) {
  return createHttpTransport({
    fetch,
    createXhr: () => new FakeXhr() as unknown as XMLHttpRequest,
  });
}

function photoFile(name = "Cannon Beach.jpg", size = 1000, type = "image/jpeg") {
  return new File([new Uint8Array(size)], name, { type });
}

function entry(change: Partial<OutboxEntry>): OutboxEntry {
  return { seq: 1, entity: "notes", entityId: "n1", op: "put", attempts: 0, ...change };
}

beforeEach(() => {
  FakeXhr.last = undefined;
});

describe("HttpTransport", () => {
  it("tech§5 push PUTs the payload as JSON with the build header and answers the stored row", async () => {
    const { calls, fetch } = fakeFetch(json(NOTE_ROW));

    const answer = await transport(fetch).push(entry({ payload: { id: "n1", text: "Milk" } }));

    expect(answer).toEqual({ ok: true, value: { entity: "notes", row: NOTE_ROW } });
    expect(calls[0]?.url).toBe("/api/notes/n1");
    expect(calls[0]?.init.method).toBe("PUT");
    expect(calls[0]?.init.body).toBe(JSON.stringify({ id: "n1", text: "Milk" }));
    expect(headersOf(calls[0]).get(BUILD_HEADER)).toBe(String(CLIENT_BUILD));
    expect(headersOf(calls[0]).get("content-type")).toBe("application/json");
  });

  it("tech§5 push sends a delete as DELETE with no body", async () => {
    const { calls, fetch } = fakeFetch(
      json({ ...NOTE_ROW, deletedAt: "2026-10-09T17:41:00.000Z" }),
    );

    const answer = await transport(fetch).push(
      entry({ op: "delete", entity: "events", entityId: "e1" }),
    );

    expect(answer.ok).toBe(true);
    expect(calls[0]?.url).toBe("/api/events/e1");
    expect(calls[0]?.init.method).toBe("DELETE");
    expect(calls[0]?.init.body).toBeUndefined();
  });

  it("tech§5 push puts settings at the account id", async () => {
    const { calls, fetch } = fakeFetch(json({ accountId: "a1" }));

    await transport(fetch).push(entry({ entity: "settings", entityId: "a1", payload: {} }));

    expect(calls[0]?.url).toBe("/api/settings/a1");
  });

  it.each([
    [401, "unauthorized"],
    [400, "invalid"],
    [403, "server"],
    [404, "invalid"],
    [409, "invalid"],
    [422, "invalid"],
    [426, "outdated"],
    [429, "server"],
    [500, "server"],
    [502, "server"],
  ])("tech§4.2 maps HTTP %i to %s", async (status, error) => {
    const { fetch } = fakeFetch(json({ error: "x" }, status));

    const answer = await transport(fetch).push(entry({ payload: {} }));

    expect(answer).toEqual({ ok: false, error });
  });

  it("SIGNIN-18 maps a 401 revoked to revoked", async () => {
    const { fetch } = fakeFetch(json({ error: "revoked" }, 401));

    expect(await transport(fetch).pull(undefined)).toEqual({ ok: false, error: "revoked" });
  });

  it("tech§4.2 answers network when the request can't reach the server", async () => {
    const { fetch } = fakeFetch(new TypeError("Failed to fetch"));

    const answer = await transport(fetch).pull(undefined);

    expect(answer).toEqual({ ok: false, error: "network" });
  });

  it("tech§4.6 a request that never answers fails as network after 60 s", async () => {
    vi.useFakeTimers();

    const fetch = (async (_url: string, init: RequestInit = {}) =>
      new Promise<Response>((_answer, fail) =>
        init.signal?.addEventListener("abort", () => fail(init.signal?.reason)),
      )) as unknown as typeof globalThis.fetch;

    const answer = transport(fetch).pull(undefined);

    await vi.advanceTimersByTimeAsync(60_000);

    expect(await answer).toEqual({ ok: false, error: "network" });

    vi.useRealTimers();
  });

  it("tech§4.2 answers server when a success body isn't JSON", async () => {
    const { fetch } = fakeFetch(new Response("<html>proxy</html>", { status: 200 }));

    const answer = await transport(fetch).weather();

    expect(answer).toEqual({ ok: false, error: "server" });
  });

  it("tech§5 pull reads every change with no cursor and the changes since a cursor", async () => {
    const page = { cursor: "12", changes: [{ entity: "notes", row: NOTE_ROW }] };
    const { calls, fetch } = fakeFetch(json(page), json({ cursor: "12", changes: [] }));
    const http = transport(fetch);

    const first = await http.pull(undefined);
    await http.pull("12");

    expect(first).toEqual({ ok: true, value: page });
    expect(calls.map((call) => call.url)).toEqual(["/api/sync", "/api/sync?since=12"]);
    expect(headersOf(calls[1]).get(BUILD_HEADER)).toBe(String(CLIENT_BUILD));
  });

  it("WX-01 weather reads the account's forecast with the build header", async () => {
    const forecast = { location: { name: "Portland" }, days: [] };
    const { calls, fetch } = fakeFetch(json(forecast));

    const answer = await transport(fetch).weather();

    expect(answer).toEqual({ ok: true, value: forecast });
    expect(calls[0]?.url).toBe("/api/weather");
    expect(headersOf(calls[0]).get(BUILD_HEADER)).toBe(String(CLIENT_BUILD));
  });

  it("D23 displays reads the account's signed-in screens with the build header", async () => {
    const screens = [{ id: "d1", kind: "monitor", browser: "Chrome", current: true }];
    const { calls, fetch } = fakeFetch(json(screens));

    const answer = await transport(fetch).displays();

    expect(answer).toEqual({ ok: true, value: screens });
    expect(calls[0]?.url).toBe("/api/displays");
    expect(headersOf(calls[0]).get(BUILD_HEADER)).toBe(String(CLIENT_BUILD));
  });

  it("SET-13 photoUsage reads the account's used and limit bytes with the build header", async () => {
    const usage = { used: 3_200_000_000, limit: 5_000_000_000 };
    const { calls, fetch } = fakeFetch(json(usage));

    const answer = await transport(fetch).photoUsage();

    expect(answer).toEqual({ ok: true, value: usage });
    expect(calls[0]?.url).toBe("/api/photos/usage");
    expect(headersOf(calls[0]).get(BUILD_HEADER)).toBe(String(CLIENT_BUILD));
  });

  it("SET-21 version reads the server's app version", async () => {
    const { calls, fetch } = fakeFetch(json({ version: "1.2.0" }));

    const answer = await transport(fetch).version();

    expect(answer).toEqual({ ok: true, value: "1.2.0" });
    expect(calls[0]?.url).toBe("/api/version");
  });

  it("SIGNIN-15 issueQr posts with the build header and reads the code's link", async () => {
    const code = { url: "https://glance.example.com/api/auth/verify?t=abc" };
    const { calls, fetch } = fakeFetch(json(code));

    const answer = await transport(fetch).issueQr();

    expect(answer).toEqual({ ok: true, value: code });
    expect(calls[0]?.url).toBe("/api/auth/qr");
    expect(calls[0]?.init.method).toBe("POST");
    expect(headersOf(calls[0]).get(BUILD_HEADER)).toBe(String(CLIENT_BUILD));
  });

  it("PHOTO-03 issueQr for Photos sends what the code opens", async () => {
    const { calls, fetch } = fakeFetch(json({ url: "https://glance.example.com/x" }));

    await transport(fetch).issueQr("photos");

    expect(calls[0]?.init.body).toBe(JSON.stringify({ opens: "photos" }));
  });

  it("D39 imports.upload posts the raw file with its encoded name and the screen it's for", async () => {
    const review = { id: "i1", newCount: 2 };
    const { calls, fetch } = fakeFetch(json(review, 201));
    const file = new File(["BEGIN:VCALENDAR"], "school year.ics", { type: "text/calendar" });

    const answer = await transport(fetch).imports.upload(file, "d1");

    expect(answer).toEqual({ ok: true, value: review });
    expect(calls[0]?.url).toBe("/api/imports?forDisplay=d1");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.body).toBe(file);
    expect(headersOf(calls[0]).get(FILE_NAME_HEADER)).toBe("school%20year.ics");
    expect(headersOf(calls[0]).get(BUILD_HEADER)).toBe(String(CLIENT_BUILD));
  });

  it("IMP-06 imports.upload answers not-ics, no-upcoming and too-large", async () => {
    const { fetch } = fakeFetch(
      json({ error: "not-ics" }, 400),
      json({ error: "no-upcoming" }, 400),
      json({ error: "too-large" }, 413),
      json({ error: "invalid" }, 400),
    );
    const file = new File(["x"], "a.ics");
    const imports = transport(fetch).imports;

    const errors = [];
    for (let i = 0; i < 4; i++) errors.push(await imports.upload(file));

    expect(errors.map((answer) => !answer.ok && answer.error)).toEqual([
      "not-ics",
      "no-upcoming",
      "too-large",
      "invalid",
    ]);
  });

  it("IMP-04 imports.staged reads this screen's staged import and answers nothing on a 404", async () => {
    const review = { id: "i1", newCount: 2 };
    const { calls, fetch } = fakeFetch(json(review), json({ error: "not-found" }, 404));
    const imports = transport(fetch).imports;

    expect(await imports.staged()).toEqual({ ok: true, value: review });
    expect(await imports.staged()).toEqual({ ok: true, value: undefined });
    expect(calls[0]?.url).toBe("/api/imports/staged");
  });

  it("IMP-08 imports.commit posts the picked who and answers the count, range and who", async () => {
    const done = { count: 2, range: { first: "2026-10-16", last: "2026-10-18" }, who: "everyone" };
    const { calls, fetch } = fakeFetch(json(done));

    expect(await transport(fetch).imports.commit("i1", "everyone")).toEqual({
      ok: true,
      value: done,
    });
    expect(calls[0]?.url).toBe("/api/imports/i1/commit");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.body).toBe(JSON.stringify({ who: "everyone" }));
  });

  it("IMP-10 imports.last answers nothing on a 404, and imports.undo posts on 204", async () => {
    const last = {
      id: "i1",
      importedAt: "2026-10-09T14:00:00.000Z",
      count: 2,
      who: "everyone",
      undoUntil: "2026-10-10T14:00:00.000Z",
    };
    const { calls, fetch } = fakeFetch(
      json(last),
      json({ error: "not-found" }, 404),
      new Response(null, { status: 204 }),
    );
    const imports = transport(fetch).imports;

    expect(await imports.last()).toEqual({ ok: true, value: last });
    expect(await imports.last()).toEqual({ ok: true, value: undefined });
    expect(await imports.undo("i1")).toEqual({ ok: true, value: undefined });
    expect(calls[0]?.url).toBe("/api/imports/last");
    expect(calls[2]?.url).toBe("/api/imports/i1/undo");
    expect(calls[2]?.init.method).toBe("POST");
  });

  it("SET-19 apiKey.get answers the masked key, or nothing on a 404", async () => {
    const saved = { tail: "7f2c", createdAt: "2026-10-09T14:00:00.000Z", lastUsedAt: null };
    const { calls, fetch } = fakeFetch(json(saved), json({ error: "not-found" }, 404));
    const apiKey = transport(fetch).apiKey;

    expect(await apiKey.get()).toEqual({ ok: true, value: saved });
    expect(await apiKey.get()).toEqual({ ok: true, value: undefined });
    expect(calls[0]?.url).toBe("/api/api-key");
  });

  it("SET-19 apiKey.create posts and answers the new key, and apiKey.revoke deletes it", async () => {
    const created = {
      tail: "2345",
      createdAt: "2026-10-09T14:00:00.000Z",
      lastUsedAt: null,
      key: "glc_live_abcdefghijklmnopqrstuvwxyz012345",
    };
    const { calls, fetch } = fakeFetch(json(created, 201), new Response(null, { status: 204 }));
    const apiKey = transport(fetch).apiKey;

    expect(await apiKey.create()).toEqual({ ok: true, value: created });
    expect(await apiKey.revoke()).toEqual({ ok: true, value: undefined });
    expect(calls.map((call) => [call.url, call.init.method])).toEqual([
      ["/api/api-key", "POST"],
      ["/api/api-key", "DELETE"],
    ]);
  });

  it("SIGNIN-15 voidQr deletes the code by its link and answers on 204", async () => {
    const { calls, fetch } = fakeFetch(new Response(null, { status: 204 }));
    const url = "https://glance.example.com/api/auth/verify?t=abc";

    const answer = await transport(fetch).voidQr(url);

    expect(answer).toEqual({ ok: true, value: undefined });
    expect(calls[0]?.url).toBe("/api/auth/qr");
    expect(calls[0]?.init.method).toBe("DELETE");
    expect(calls[0]?.init.body).toBe(JSON.stringify({ url }));
  });

  it("NOTIF-08 webPush.key reads the VAPID public key", async () => {
    const { calls, fetch } = fakeFetch(json({ key: "BPublicKey" }));

    const answer = await transport(fetch).webPush.key();

    expect(answer).toEqual({ ok: true, value: "BPublicKey" });
    expect(calls[0]?.url).toBe("/api/push/key");
  });

  it("NOTIF-08 webPush.subscribe puts this device's subscription and unsubscribe deletes it", async () => {
    const subscription = {
      endpoint: "https://push.example.com/abc",
      keys: { p256dh: "p256", auth: "secret" },
    };
    const { calls, fetch } = fakeFetch(
      new Response(null, { status: 204 }),
      new Response(null, { status: 204 }),
    );

    expect(await transport(fetch).webPush.subscribe(subscription)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(await transport(fetch).webPush.unsubscribe()).toEqual({ ok: true, value: undefined });
    expect(calls.map((call) => [call.url, call.init.method])).toEqual([
      ["/api/push/subscription", "PUT"],
      ["/api/push/subscription", "DELETE"],
    ]);
    expect(calls[0]?.init.body).toBe(JSON.stringify(subscription));
  });

  it("WX-07 places searches with the query encoded", async () => {
    const places = [{ name: "Portland", region: "Oregon", lat: 45.5, lon: -122.7 }];
    const { calls, fetch } = fakeFetch(json(places));

    const answer = await transport(fetch).places("Portland, OR");

    expect(answer).toEqual({ ok: true, value: places });
    expect(calls[0]?.url).toBe("/api/weather/places?q=Portland%2C%20OR");
  });

  it("LOC-04 locate asks for the place at the position", async () => {
    const place = {
      name: "Portland",
      region: "Oregon",
      lat: 45.52,
      lon: -122.68,
      timeZone: "America/Los_Angeles",
    };
    const { calls, fetch } = fakeFetch(json(place));

    const answer = await transport(fetch).locate({ lat: 45.51523, lon: -122.67836 });

    expect(answer).toEqual({ ok: true, value: place });
    expect(calls[0]?.url).toBe("/api/weather/locate?lat=45.51523&lon=-122.67836");
  });

  it("LOC-03 locate answers outside on a 404 and maps other failures as usual", async () => {
    const { fetch } = fakeFetch(
      json({ error: "not-found" }, 404),
      json({ error: "weather-failed" }, 502),
      new TypeError("offline"),
    );
    const at = { lat: 43.65, lon: -79.38 };

    expect(await transport(fetch).locate(at)).toEqual({ ok: false, error: "outside" });
    expect(await transport(fetch).locate(at)).toEqual({ ok: false, error: "server" });
    expect(await transport(fetch).locate(at)).toEqual({ ok: false, error: "network" });
  });

  it("SIGNIN-03 auth.sendCode posts the email and time zone and answers on 204", async () => {
    const { calls, fetch } = fakeFetch(new Response(null, { status: 204 }));

    const answer = await transport(fetch).auth.sendCode({
      email: "maria@example.com",
      timeZone: "America/Los_Angeles",
    });

    expect(answer).toEqual({ ok: true, value: undefined });
    expect(calls[0]?.url).toBe("/api/auth/code");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.body).toBe(
      JSON.stringify({ email: "maria@example.com", timeZone: "America/Los_Angeles" }),
    );
  });

  it("SIGNIN-04 auth.verifyCode posts the email and code and answers the signed-in status", async () => {
    const status = {
      state: "signed-in",
      account: { id: "a1", name: null, email: "maria@example.com" },
      returning: false,
      setupDone: false,
    };
    const { calls, fetch } = fakeFetch(json(status));

    const answer = await transport(fetch).auth.verifyCode({
      email: "maria@example.com",
      code: "482913",
    });

    expect(answer).toEqual({ ok: true, value: status });
    expect(calls[0]?.url).toBe("/api/auth/code/verify");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.body).toBe(
      JSON.stringify({ email: "maria@example.com", code: "482913" }),
    );
  });

  it.each(["wrong-code", "code-locked", "code-expired"] as const)(
    "SIGNIN-17 auth.verifyCode answers a 400 %s as that error",
    async (error) => {
      const { fetch } = fakeFetch(json({ error }, 400));

      const answer = await transport(fetch).auth.verifyCode({
        email: "maria@example.com",
        code: "482913",
      });

      expect(answer).toEqual({ ok: false, error });
    },
  );

  it("tech§6.2 auth.verifyCode keeps the usual errors for anything else", async () => {
    const { fetch } = fakeFetch(
      json({ error: "invalid" }, 400),
      json({ error: "rate-limited" }, 429),
      new TypeError("offline"),
    );
    const auth = transport(fetch).auth;
    const request = { email: "maria@example.com", code: "482913" };

    expect(await auth.verifyCode(request)).toEqual({ ok: false, error: "invalid" });
    expect(await auth.verifyCode(request)).toEqual({ ok: false, error: "server" });
    expect(await auth.verifyCode(request)).toEqual({ ok: false, error: "network" });
  });

  it("SIGNIN-22 auth.verifyLink posts the scanned token and answers the signed-in status", async () => {
    const status = {
      state: "signed-in",
      account: { id: "a1", name: "Maria", email: "maria@example.com" },
      returning: true,
      setupDone: true,
    };
    const { calls, fetch } = fakeFetch(json(status), json({ error: "link-stale" }, 400));
    const auth = transport(fetch).auth;

    expect(await auth.verifyLink("abc123")).toEqual({ ok: true, value: status });
    expect(calls[0]?.url).toBe("/api/auth/verify");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.body).toBe(JSON.stringify({ t: "abc123" }));
    expect(await auth.verifyLink("abc123")).toEqual({ ok: false, error: "invalid" });
  });

  it("tech§6.2 auth.status reads whether the screen is signed in", async () => {
    const { calls, fetch } = fakeFetch(json({ state: "signed-out" }));

    const answer = await transport(fetch).auth.status();

    expect(answer).toEqual({ ok: true, value: { state: "signed-out" } });
    expect(calls[0]?.url).toBe("/api/auth/status");
  });

  it("SIGNIN-06 auth.name posts the name and answers the account", async () => {
    const account = { id: "a1", name: "Maria", email: "m@x.com" };
    const { calls, fetch } = fakeFetch(json(account));

    const answer = await transport(fetch).auth.name("Maria");

    expect(answer).toEqual({ ok: true, value: account });
    expect(calls[0]?.url).toBe("/api/auth/name");
    expect(calls[0]?.init.body).toBe(JSON.stringify({ name: "Maria" }));
  });

  it("SIGNIN-14 auth.location posts the place or the skip and answers on 204", async () => {
    const { calls, fetch } = fakeFetch(new Response(null, { status: 204 }));

    const answer = await transport(fetch).auth.location({ skip: true });

    expect(answer).toEqual({ ok: true, value: undefined });
    expect(calls[0]?.url).toBe("/api/auth/location");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.body).toBe(JSON.stringify({ skip: true }));
  });

  it("SIGNIN-11 auth.signout posts and answers on 204", async () => {
    const { calls, fetch } = fakeFetch(new Response(null, { status: 204 }));

    const answer = await transport(fetch).auth.signout();

    expect(answer).toEqual({ ok: true, value: undefined });
    expect(calls[0]?.url).toBe("/api/auth/signout");
    expect(calls[0]?.init.method).toBe("POST");
  });

  it("D22 upload sends the raw file with its type, encoded name, modified date and build header", async () => {
    const file = photoFile();

    const answer = transport(fakeFetch().fetch).upload(file, "2026-08-16", () => {});
    sentXhr().answer(201, PHOTO_ROW);

    expect(await answer).toEqual({ ok: true, value: PHOTO_ROW });
    expect(sentXhr().method).toBe("POST");
    expect(sentXhr().url).toBe("/api/photos");
    expect(sentXhr().body).toBe(file);
    expect(sentXhr().headers["content-type"]).toBe("image/jpeg");
    expect(sentXhr().headers[FILE_NAME_HEADER]).toBe("Cannon%20Beach.jpg");
    expect(sentXhr().headers[FILE_MODIFIED_HEADER]).toBe("2026-08-16");
    expect(sentXhr().headers[BUILD_HEADER]).toBe(String(CLIENT_BUILD));
  });

  it("PHOTO-04 upload reports the real progress as a whole percent", async () => {
    const percents: number[] = [];

    const answer = transport(fakeFetch().fetch).upload(photoFile(), "2026-08-16", (percent) =>
      percents.push(percent),
    );
    sentXhr().progress(250, 1000);
    sentXhr().progress(1000, 3000);
    sentXhr().answer(201, PHOTO_ROW);
    await answer;

    expect(percents).toEqual([25, 33]);
  });

  it.each([
    ["too-large", photoFile("big.jpg", MAX_PHOTO_BYTES + 1)],
    ["not-a-photo", photoFile("notes.pdf", 1000, "application/pdf")],
  ])("PHOTO-04 upload refuses a %s file before sending it", async (problem, file) => {
    const answer = await transport(fakeFetch().fetch).upload(file, "2026-08-16", () => {});

    expect(answer).toEqual({ ok: false, error: problem });
    expect(FakeXhr.last).toBeUndefined();
  });

  it.each([
    [413, "too-large"],
    [415, "not-a-photo"],
    [507, "storage-full"],
    [401, "unauthorized"],
    [426, "outdated"],
    [500, "server"],
  ])("PHOTO-04 upload maps HTTP %i to %s", async (status, error) => {
    const answer = transport(fakeFetch().fetch).upload(photoFile(), "2026-08-16", () => {});
    sentXhr().answer(status, { error: "x" });

    expect(await answer).toEqual({ ok: false, error });
  });

  it("SIGNIN-18 upload maps a 401 revoked to revoked", async () => {
    const answer = transport(fakeFetch().fetch).upload(photoFile(), "2026-08-16", () => {});
    sentXhr().answer(401, { error: "revoked" });

    expect(await answer).toEqual({ ok: false, error: "revoked" });
  });

  it("SET-14 deleteAccount sends DELETE /api/account", async () => {
    const { calls, fetch } = fakeFetch(new Response(null, { status: 204 }));

    expect(await transport(fetch).auth.deleteAccount()).toEqual({ ok: true, value: undefined });
    expect(calls[0]?.url).toBe("/api/account");
    expect(calls[0]?.init.method).toBe("DELETE");
  });

  it("SIGNIN-11 signoutAll posts to signout-all", async () => {
    const { calls, fetch } = fakeFetch(new Response(null, { status: 204 }));

    expect(await transport(fetch).auth.signoutAll()).toEqual({ ok: true, value: undefined });
    expect(calls[0]?.url).toBe("/api/auth/signout-all");
    expect(calls[0]?.init.method).toBe("POST");
  });

  it.each(["onerror", "onabort", "ontimeout"] as const)(
    "PHOTO-09 upload answers network on %s",
    async (event) => {
      const answer = transport(fakeFetch().fetch).upload(photoFile(), "2026-08-16", () => {});
      sentXhr()[event]?.();

      expect(await answer).toEqual({ ok: false, error: "network" });
    },
  );
});
