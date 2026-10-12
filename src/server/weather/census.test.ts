import { createCensusGeocoder } from "./census";
import OUTSIDE from "./census.outside.json";
import PORTLAND from "./census.portland.json";

const AT = { lat: 45.52, lon: -122.68 };

function answering(body: unknown, status = 200) {
  return vi.fn(async (_url: string, _init?: RequestInit) => Response.json(body, { status }));
}

function geographies(found: Record<string, { NAME: string; BASENAME: string }[]>) {
  return {
    result: {
      geographies: { ...found, States: [{ NAME: "Maryland", BASENAME: "Maryland", STUSAB: "MD" }] },
    },
  };
}

const area = (BASENAME: string, NAME = BASENAME) => ({ NAME, BASENAME });

describe("createCensusGeocoder", () => {
  it("LOC-04 asks the Census Geocoder for the geographies at the coordinates", async () => {
    const fetchFn = answering(PORTLAND);

    await createCensusGeocoder(fetchFn).placeAt(AT);

    const url = new URL(String(fetchFn.mock.calls[0]?.[0]));

    expect(url.origin + url.pathname).toBe(
      "https://geocoding.geo.census.gov/geocoder/geographies/coordinates",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      x: "-122.68",
      y: "45.52",
      benchmark: "Public_AR_Current",
      vintage: "Current_Current",
      format: "json",
    });
  });

  it("LOC-04 names the place by its incorporated place and state", async () => {
    expect(await createCensusGeocoder(answering(PORTLAND)).placeAt(AT)).toEqual({
      ok: true,
      value: { name: "Portland", region: "Oregon" },
    });
  });

  it("LOC-04 falls back to a census designated place, a county subdivision, then a county", async () => {
    const placeAt = (found: Parameters<typeof geographies>[0]) =>
      createCensusGeocoder(answering(geographies(found))).placeAt(AT);

    expect(
      await placeAt({
        "Census Designated Places": [area("North Bethesda", "North Bethesda CDP")],
        "County Subdivisions": [area("Rockville", "Rockville district")],
      }),
    ).toEqual({ ok: true, value: { name: "North Bethesda", region: "Maryland" } });
    expect(
      await placeAt({
        "County Subdivisions": [area("Rockville", "Rockville district")],
        Counties: [area("Montgomery", "Montgomery County")],
      }),
    ).toEqual({ ok: true, value: { name: "Rockville", region: "Maryland" } });
    expect(
      await placeAt({
        "County Subdivisions": [area("4", "District 4")],
        Counties: [area("Montgomery", "Montgomery County")],
      }),
    ).toEqual({ ok: true, value: { name: "Montgomery County", region: "Maryland" } });
  });

  it("LOC-03 answers not-found where there is no US state", async () => {
    expect(await createCensusGeocoder(answering(OUTSIDE)).placeAt(AT)).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("LOC-03 fails when the service errors, can't be reached or answers the wrong shape", async () => {
    const unreachable = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    const failed = { ok: false, error: "weather-failed" };

    expect(await createCensusGeocoder(answering({}, 500)).placeAt(AT)).toEqual(failed);
    expect(await createCensusGeocoder(unreachable).placeAt(AT)).toEqual(failed);
    expect(await createCensusGeocoder(answering({ result: {} })).placeAt(AT)).toEqual(failed);
  });
});
