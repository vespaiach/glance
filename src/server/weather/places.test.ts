import { type GeocodingResult, placeLabel, placeQuery, toPlaces } from "./places";

const result = (name: string, admin1: string, latitude = 1, longitude = 2): GeocodingResult => ({
  name,
  admin1,
  latitude,
  longitude,
});

const PORTLANDS = [
  result("Portland", "Oregon", 45.52345, -122.67621),
  result("Portland", "Maine", 43.65737, -70.2589),
  result("Blue Island", "Illinois"),
  result("Portland", "Texas"),
];

describe("placeQuery", () => {
  it("WX-09 searches a city by its name", () => {
    expect(placeQuery("  Portland ")).toEqual({ search: "Portland" });
  });

  it("WX-08 searches the city part of a city and state", () => {
    expect(placeQuery("Austin, TX")).toEqual({ search: "Austin", state: "TX" });
  });

  it("WX-09 searches a ZIP code as it is", () => {
    expect(placeQuery("97214")).toEqual({ search: "97214" });
  });
});

describe("toPlaces", () => {
  it("WX-09 lists the places with the searched name, with their state and coordinates", () => {
    expect(toPlaces(PORTLANDS, placeQuery("portland"))).toEqual([
      { name: "Portland", region: "Oregon", lat: 45.52345, lon: -122.67621 },
      { name: "Portland", region: "Maine", lat: 43.65737, lon: -70.2589 },
      { name: "Portland", region: "Texas", lat: 1, lon: 2 },
    ]);
  });

  it("WX-08 finds nothing when only other names come back", () => {
    expect(toPlaces([result("Portland", "Oregon")], placeQuery("Pordland"))).toEqual([]);
  });

  it("WX-08 keeps only the state given by its code or its name", () => {
    expect(toPlaces(PORTLANDS, placeQuery("Portland, me")).map(({ region }) => region)).toEqual([
      "Maine",
    ]);
    expect(toPlaces(PORTLANDS, placeQuery("Portland, Texas")).map(({ region }) => region)).toEqual([
      "Texas",
    ]);
  });

  it("WX-09 matches names regardless of case, accents and punctuation", () => {
    const places = toPlaces([result("St. Louis", "Missouri")], placeQuery("st louis"));

    expect(places.map(({ name }) => name)).toEqual(["St. Louis"]);
  });

  it("WX-09 keeps every place a ZIP code returns, whatever its name", () => {
    expect(toPlaces([result("Portland", "Oregon")], placeQuery("97214"))).toEqual([
      { name: "Portland", region: "Oregon", lat: 1, lon: 2 },
    ]);
  });

  it("WX-09 lists a name and state once, and at most 5 places", () => {
    const many = ["Oregon", "Oregon", "Maine", "Texas", "Ohio", "Iowa", "Utah"].map((state) =>
      result("Portland", state),
    );

    expect(toPlaces(many, placeQuery("Portland")).map(({ region }) => region)).toEqual([
      "Oregon",
      "Maine",
      "Texas",
      "Ohio",
      "Iowa",
    ]);
  });
});

describe("placeLabel", () => {
  it("WX-01 names a place by its city and state code, like the boards", () => {
    expect(placeLabel({ name: "Portland", region: "Oregon", lat: 1, lon: 2 })).toBe("Portland, OR");
  });

  it("WX-01 codes Puerto Rico too, and keeps a region with no code", () => {
    expect(placeLabel({ name: "San Juan", region: "Puerto Rico", lat: 1, lon: 2 })).toBe(
      "San Juan, PR",
    );
    expect(placeLabel({ name: "Somewhere", region: "Elsewhere", lat: 1, lon: 2 })).toBe(
      "Somewhere, Elsewhere",
    );
  });
});
