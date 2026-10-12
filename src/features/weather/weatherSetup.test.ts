import type { WeatherLocation } from "@/domain/schemas";
import {
  initialWeatherSetup,
  placeQuery,
  type WeatherSetupState,
  weatherSetupReducer,
} from "./weatherSetup";

const PORTLANDS: WeatherLocation[] = [
  { name: "Portland", region: "Oregon", lat: 45.5152, lon: -122.6784 },
  { name: "Portland", region: "Maine", lat: 43.6591, lon: -70.2568 },
];

const SEARCH = { query: "Portland", unknown: "Pordland", matches: PORTLANDS };

const editing = (draft: string): WeatherSetupState => ({ step: "editing", draft });

const searching = (query: string): WeatherSetupState => ({
  step: "searching",
  draft: query,
  query,
});

describe("weather setup reducer", () => {
  it("WX-04 starts with an empty field and no error", () => {
    expect(initialWeatherSetup(undefined, SEARCH)).toEqual(editing(""));
  });

  it("WX-04 typing updates the draft", () => {
    expect(weatherSetupReducer(editing("Port"), { type: "type", draft: "Portl" })).toEqual(
      editing("Portl"),
    );
  });

  it("WX-04 Show weather with an empty field asks for a city or ZIP code", () => {
    expect(weatherSetupReducer(editing(""), { type: "submit" })).toEqual({
      step: "editing",
      draft: "",
      error: "empty",
    });
  });

  it("WX-04 a field of only spaces counts as empty", () => {
    expect(weatherSetupReducer(editing("   "), { type: "submit" })).toMatchObject({
      error: "empty",
    });
  });

  it("WX-07 Show weather starts searching for the trimmed query", () => {
    expect(weatherSetupReducer(editing(" Portland "), { type: "submit" })).toEqual({
      step: "searching",
      draft: " Portland ",
      query: "Portland",
    });
  });

  it("WX-07 typing cancels the search", () => {
    const searching: WeatherSetupState = {
      step: "searching",
      draft: "Portland",
      query: "Portland",
    };

    expect(weatherSetupReducer(searching, { type: "type", draft: "Portlan" })).toEqual(
      editing("Portlan"),
    );
  });

  it("WX-08 the next keystroke clears the unknown-place error", () => {
    const unknown: WeatherSetupState = { step: "editing", draft: "Pordland", error: "unknown" };

    expect(weatherSetupReducer(unknown, { type: "type", draft: "Pordlan" })).toEqual(
      editing("Pordlan"),
    );
  });

  it("WX-09 typing clears the list of matches", () => {
    const choosing: WeatherSetupState = { step: "choosing", draft: "Portland", matches: PORTLANDS };

    expect(weatherSetupReducer(choosing, { type: "type", draft: "Portland," })).toEqual(
      editing("Portland,"),
    );
  });

  it("WX-09 several matches list the places to choose from", () => {
    expect(
      weatherSetupReducer(searching("Portland"), { type: "found", matches: PORTLANDS }),
    ).toEqual({ step: "choosing", draft: "Portland", matches: PORTLANDS });
  });

  it("WX-08 no match shows the unknown-place error and keeps the draft", () => {
    expect(weatherSetupReducer(searching("Pordland"), { type: "found", matches: [] })).toEqual({
      step: "editing",
      draft: "Pordland",
      error: "unknown",
    });
  });

  it("WX-09 a single match stays on the search while the place is saved", () => {
    const state = searching("97214");

    expect(weatherSetupReducer(state, { type: "found", matches: PORTLANDS.slice(0, 1) })).toBe(
      state,
    );
  });

  it("WX-07 a failed search shows the search-unavailable error and keeps the draft", () => {
    expect(weatherSetupReducer(searching("Portland"), { type: "failed" })).toEqual({
      step: "editing",
      draft: "Portland",
      error: "unavailable",
    });
  });

  it("WX-07 an answer that arrives after typing is ignored", () => {
    const state = editing("Portlan");

    expect(weatherSetupReducer(state, { type: "found", matches: PORTLANDS })).toBe(state);
    expect(weatherSetupReducer(state, { type: "failed" })).toBe(state);
  });

  it("WX-07 a query is the draft trimmed", () => {
    expect(placeQuery("  Austin, TX ")).toBe("Austin, TX");
  });

  it("WX-07 wx=searching starts searching for the fixture query", () => {
    expect(initialWeatherSetup("searching", SEARCH)).toEqual({
      step: "searching",
      draft: "Portland",
      query: "Portland",
    });
  });

  it("WX-08 wx=unknown starts on the unknown place with the error shown", () => {
    expect(initialWeatherSetup("unknown", SEARCH)).toEqual({
      step: "editing",
      draft: "Pordland",
      error: "unknown",
    });
  });

  it("WX-09 wx=choose starts on the fixture matches", () => {
    expect(initialWeatherSetup("choose", SEARCH)).toEqual({
      step: "choosing",
      draft: "Portland",
      matches: PORTLANDS,
    });
  });
});
