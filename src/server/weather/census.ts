import "server-only";
import * as v from "valibot";
import { err, ok, type Result } from "@/domain/result";
import { type Fetch, getJson } from "./getJson";
import type { Coordinates, LocateFailure, PlaceLocator, PlaceName } from "./provider";

const COORDINATES_URL = "https://geocoding.geo.census.gov/geocoder/geographies/coordinates";

const AreaSchema = v.object({ NAME: v.string(), BASENAME: v.string() });

const Areas = v.optional(v.array(AreaSchema), []);

const CensusResponseSchema = v.object({
  result: v.object({
    geographies: v.object({
      "Incorporated Places": Areas,
      "Census Designated Places": Areas,
      "County Subdivisions": Areas,
      Counties: Areas,
      States: Areas,
    }),
  }),
});

type Geographies = v.InferOutput<typeof CensusResponseSchema>["result"]["geographies"];

const NAMED = /\p{L}/u;

export function createCensusGeocoder(fetchFn: Fetch): PlaceLocator {
  return {
    placeAt: async (place) => {
      const response = await getJson(fetchFn, coordinatesUrl(place), CensusResponseSchema);

      return response.ok ? placeIn(response.value.result.geographies) : response;
    },
  };
}

function coordinatesUrl({ lat, lon }: Coordinates): string {
  const params = new URLSearchParams({
    x: String(lon),
    y: String(lat),
    benchmark: "Public_AR_Current",
    vintage: "Current_Current",
    format: "json",
  });

  return `${COORDINATES_URL}?${params}`;
}

function placeIn(geographies: Geographies): Result<PlaceName, LocateFailure> {
  const state = geographies.States[0]?.BASENAME;

  const name = areaName(geographies);

  return state && name ? ok({ name, region: state }) : err("not-found");
}

function areaName(geographies: Geographies): string | undefined {
  const named = [
    ...geographies["Incorporated Places"],
    ...geographies["Census Designated Places"],
    ...geographies["County Subdivisions"],
  ].find((area) => NAMED.test(area.BASENAME));

  return named?.BASENAME ?? geographies.Counties[0]?.NAME;
}
