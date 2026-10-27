import * as v from "valibot";
import { spyOnLoggedErrors } from "../testLog";
import { getJson } from "./getJson";

const URL_WITH_COORDINATES =
  "https://api.open-meteo.com/v1/forecast?latitude=45.52&longitude=-122.68";

const Schema = v.object({ current: v.object({ temp: v.number() }) });

function answering(body: unknown, status = 200) {
  return vi.fn(async () => Response.json(body, { status }));
}

describe("getJson", () => {
  it("D13 answers the parsed body and logs nothing", async () => {
    const logged = spyOnLoggedErrors();

    const answer = await getJson(
      answering({ current: { temp: 64 } }),
      URL_WITH_COORDINATES,
      Schema,
    );

    expect(answer).toEqual({ ok: true, value: { current: { temp: 64 } } });
    expect(logged()).toEqual([]);
  });

  it("tech§6.6 logs a bad status with the host and status, never the coordinates", async () => {
    const logged = spyOnLoggedErrors();

    const answer = await getJson(answering({ reason: "busy" }, 503), URL_WITH_COORDINATES, Schema);

    expect(answer).toEqual({ ok: false, error: "weather-failed" });
    expect(logged()).toEqual([
      {
        level: "error",
        time: expect.any(String),
        source: "weather",
        event: "bad-status",
        host: "api.open-meteo.com",
        status: 503,
        error: expect.objectContaining({ message: "status 503" }),
      },
    ]);
    expect(JSON.stringify(logged())).not.toMatch(/45\.52|122\.68/);
  });

  it("tech§6.6 logs a fetch that throws with the host", async () => {
    const logged = spyOnLoggedErrors();
    const fetchFn = vi.fn(async () => Promise.reject(new TypeError("fetch failed")));

    const answer = await getJson(fetchFn, URL_WITH_COORDINATES, Schema);

    expect(answer).toEqual({ ok: false, error: "weather-failed" });
    expect(logged()).toMatchObject([
      {
        source: "weather",
        event: "fetch-failed",
        host: "api.open-meteo.com",
        error: { name: "TypeError", message: "fetch failed" },
      },
    ]);
  });

  it("tech§6.6 logs a body that fails the schema with the bad paths, not the values", async () => {
    const logged = spyOnLoggedErrors();

    const answer = await getJson(
      answering({ current: { temp: "45.52" } }),
      URL_WITH_COORDINATES,
      Schema,
    );

    expect(answer).toEqual({ ok: false, error: "weather-failed" });
    expect(logged()).toMatchObject([
      {
        source: "weather",
        event: "bad-response",
        host: "api.open-meteo.com",
        error: { message: "bad body at current.temp" },
      },
    ]);
    expect(JSON.stringify(logged())).not.toContain("45.52");
  });
});
