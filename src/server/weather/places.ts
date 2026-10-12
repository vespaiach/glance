import "server-only";
import * as v from "valibot";
import { copy } from "@/copy";
import type { WeatherLocation } from "@/domain/schemas";
import { isTimeZone } from "@/domain/signIn";

export const GeocodingResponseSchema = v.object({
  results: v.optional(
    v.array(
      v.object({
        name: v.string(),
        admin1: v.optional(v.string()),
        latitude: v.number(),
        longitude: v.number(),
        timezone: v.optional(v.string()),
      }),
    ),
    [],
  ),
});

export type GeocodingResult = v.InferOutput<typeof GeocodingResponseSchema>["results"][number];

export type PlaceQuery = { search: string; state?: string };

const MAX_PLACES = 5;

const ZIP_CODE = /^\d{5}$/;

const STATE_CODES: Readonly<Record<string, string>> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district of columbia": "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "puerto rico": "PR",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

export function placeQuery(query: string): PlaceQuery {
  const [search = "", state] = query.split(",").map((part) => part.trim());

  return state ? { search, state } : { search };
}

export function toPlaces(results: GeocodingResult[], query: PlaceQuery): WeatherLocation[] {
  const places = results
    .filter((result) => namedAs(result, query.search) && inState(result, query.state))
    .flatMap(toPlace);

  return distinct(places).slice(0, MAX_PLACES);
}

export function placeLabel({ name, region }: WeatherLocation): string {
  return copy.weather.place(name, stateCode(region) ?? region);
}

function namedAs(result: GeocodingResult, search: string): boolean {
  return ZIP_CODE.test(search) || normalized(result.name) === normalized(search);
}

function inState({ admin1 = "" }: GeocodingResult, state: string | undefined): boolean {
  if (state === undefined) return true;

  const wanted = normalized(state);

  return normalized(admin1) === wanted || stateCode(admin1)?.toLowerCase() === wanted;
}

function toPlace({
  name,
  admin1,
  latitude,
  longitude,
  timezone,
}: GeocodingResult): WeatherLocation[] {
  if (timezone === undefined || !isTimeZone(timezone)) return [];

  return [{ name, region: admin1 ?? "", lat: latitude, lon: longitude, timeZone: timezone }];
}

function distinct(places: WeatherLocation[]): WeatherLocation[] {
  const seen = new Set<string>();

  return places.filter(({ name, region }) => {
    const key = `${name}|${region}`;

    if (seen.has(key)) return false;

    seen.add(key);

    return true;
  });
}

function stateCode(region: string): string | undefined {
  return STATE_CODES[normalized(region)];
}

function normalized(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
