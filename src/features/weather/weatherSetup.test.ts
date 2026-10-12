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

const LOCATED = PORTLANDS[0] as WeatherLocation;

const SEARCH = {
  query: "Portland",
  unknown: "Pordland",
  matches: PORTLANDS,
  located: { draft: "Portland, OR", place: LOCATED },
  otherZone: PORTLANDS[1] as WeatherLocation,
};

const MAINE = PORTLANDS[1] as WeatherLocation;

const confirming = (draft: string): WeatherSetupState => ({
  step: "confirm-zone",
  draft,
  place: MAINE,
});

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

  it("LOC-02 Use my location starts locating and keeps the draft", () => {
    expect(weatherSetupReducer(editing("Port"), { type: "locate" })).toEqual({
      step: "locating",
      draft: "Port",
    });
  });

  it("LOC-02 Use my location from the list of matches starts locating", () => {
    const choosing: WeatherSetupState = { step: "choosing", draft: "Portland", matches: PORTLANDS };

    expect(weatherSetupReducer(choosing, { type: "locate" })).toEqual({
      step: "locating",
      draft: "Portland",
    });
  });

  it("LOC-02 Use my location is ignored while a search runs", () => {
    const state = searching("Portland");

    expect(weatherSetupReducer(state, { type: "locate" })).toBe(state);
  });

  it("LOC-02 typing cancels locating", () => {
    expect(
      weatherSetupReducer({ step: "locating", draft: "" }, { type: "type", draft: "P" }),
    ).toEqual(editing("P"));
  });

  it("LOC-03 a failure returns to the card with a notice and the draft kept", () => {
    expect(
      weatherSetupReducer(
        { step: "locating", draft: "Port" },
        { type: "locate-failed", reason: "outside" },
      ),
    ).toEqual({ step: "editing", draft: "Port", notice: "outside" });
  });

  it("LOC-03 a failure that arrives after typing is ignored", () => {
    const state = editing("P");

    expect(weatherSetupReducer(state, { type: "locate-failed", reason: "lookup" })).toBe(state);
  });

  it("LOC-03 the next keystroke clears the notice", () => {
    const failed: WeatherSetupState = { step: "editing", draft: "", notice: "denied" };

    expect(weatherSetupReducer(failed, { type: "type", draft: "P" })).toEqual(editing("P"));
  });

  it("tech§4.4 a failed save shows the error and keeps the draft and the place", () => {
    expect(
      weatherSetupReducer({ step: "locating", draft: "" }, { type: "save-failed", place: LOCATED }),
    ).toEqual({ step: "editing", draft: "", error: "save-failed", place: LOCATED });
  });

  it("tech§4.4 the primary after a failed save clears the error and keeps the place", () => {
    const failed: WeatherSetupState = {
      step: "editing",
      draft: "Portland, OR",
      error: "save-failed",
      place: LOCATED,
    };

    expect(weatherSetupReducer(failed, { type: "submit" })).toEqual({
      step: "editing",
      draft: "Portland, OR",
      place: LOCATED,
    });
  });

  it("tech§4.4 typing after a failed save drops the kept place", () => {
    const failed: WeatherSetupState = {
      step: "editing",
      draft: "Portland, OR",
      error: "save-failed",
      place: LOCATED,
    };

    expect(weatherSetupReducer(failed, { type: "type", draft: "Portland, O" })).toEqual(
      editing("Portland, O"),
    );
  });

  it("LOC-02 wx=locating starts locating with an empty field", () => {
    expect(initialWeatherSetup("locating", SEARCH)).toEqual({ step: "locating", draft: "" });
  });

  it.each(["denied", "no-position", "outside", "lookup"] as const)(
    "LOC-03 wx=%s starts on that failure's notice",
    (reason) => {
      expect(initialWeatherSetup(reason, SEARCH)).toEqual({
        step: "editing",
        draft: "",
        notice: reason,
      });
    },
  );

  it("tech§4.4 wx=savefail starts on the failed save of the found place", () => {
    expect(initialWeatherSetup("savefail", SEARCH)).toEqual({
      step: "editing",
      draft: "Portland, OR",
      error: "save-failed",
      place: LOCATED,
    });
  });

  it.each<WeatherSetupState>([
    searching("Portland"),
    { step: "choosing", draft: "Portland", matches: PORTLANDS },
    { step: "locating", draft: "Portland" },
  ])("LOC-09 a place in another zone asks first from $step", (state) => {
    expect(weatherSetupReducer(state, { type: "ask-zone", place: MAINE })).toEqual(
      confirming("Portland"),
    );
  });

  it("LOC-09 Keep goes back to the card with the draft kept", () => {
    expect(weatherSetupReducer(confirming("Portland"), { type: "keep" })).toEqual(
      editing("Portland"),
    );
  });

  it("LOC-09 Keep is ignored outside the confirm", () => {
    expect(weatherSetupReducer(searching("Portland"), { type: "keep" })).toEqual(
      searching("Portland"),
    );
  });

  it("LOC-09 a failed save from the confirm returns to the card with the place kept", () => {
    expect(
      weatherSetupReducer(confirming("Portland"), { type: "save-failed", place: MAINE }),
    ).toEqual({ step: "editing", draft: "Portland", error: "save-failed", place: MAINE });
  });

  it("LOC-09 wx=tz starts on the confirm for Portland, ME on the Location page", () => {
    expect(initialWeatherSetup("tz", SEARCH, { confirmsZone: true })).toEqual(
      confirming("Portland"),
    );
  });

  it("LOC-09 wx=tz is the plain card where no zone is asked", () => {
    expect(initialWeatherSetup("tz", SEARCH)).toEqual(editing(""));
  });
});
