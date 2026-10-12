import type { WeatherLocation } from "@/domain/schemas";
import { initialWeatherSetup, type WeatherSetupState, weatherSetupReducer } from "./weatherSetup";

const PORTLANDS: WeatherLocation[] = [
  { name: "Portland", region: "Oregon", lat: 45.5152, lon: -122.6784 },
  { name: "Portland", region: "Maine", lat: 43.6591, lon: -70.2568 },
];

const SEARCH = { query: "Portland", unknown: "Pordland", matches: PORTLANDS };

const editing = (draft: string): WeatherSetupState => ({ step: "editing", draft });

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
