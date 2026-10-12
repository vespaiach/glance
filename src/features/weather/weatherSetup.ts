import type { FixtureParams } from "@/data/repos";
import type { WeatherLocation } from "@/domain/schemas";

export type WeatherFixture = FixtureParams["wx"];

export type SetupError = "empty" | "unknown" | "unavailable" | "save-failed";

export type LocateFailure = "denied" | "no-position" | "outside" | "lookup";

export type WeatherSetupState =
  | {
      step: "editing";
      draft: string;
      error?: SetupError;
      notice?: LocateFailure;
      place?: WeatherLocation;
    }
  | { step: "searching"; draft: string; query: string }
  | { step: "choosing"; draft: string; matches: readonly WeatherLocation[] }
  | { step: "locating"; draft: string };

export type WeatherSetupAction =
  | { type: "type"; draft: string }
  | { type: "submit" }
  | { type: "found"; matches: readonly WeatherLocation[] }
  | { type: "failed" }
  | { type: "locate" }
  | { type: "locate-failed"; reason: LocateFailure }
  | { type: "save-failed"; place: WeatherLocation };

export type FixtureSearch = {
  query: string;
  unknown: string;
  matches: readonly WeatherLocation[];
  located: { draft: string; place: WeatherLocation };
};

export function placeQuery(draft: string): string {
  return draft.trim();
}

function submit(state: WeatherSetupState): WeatherSetupState {
  if (state.step === "editing" && state.place) {
    return { step: "editing", draft: state.draft, place: state.place };
  }

  const query = placeQuery(state.draft);

  if (query === "") return { step: "editing", draft: state.draft, error: "empty" };

  return { step: "searching", draft: state.draft, query };
}

function found(state: WeatherSetupState, matches: readonly WeatherLocation[]): WeatherSetupState {
  if (matches.length === 0) return { step: "editing", draft: state.draft, error: "unknown" };

  if (matches.length === 1) return state;

  return { step: "choosing", draft: state.draft, matches };
}

function answered(state: WeatherSetupState, action: WeatherSetupAction): WeatherSetupState {
  if (state.step !== "searching") return state;

  if (action.type === "found") return found(state, action.matches);

  return { step: "editing", draft: state.draft, error: "unavailable" };
}

function locate(state: WeatherSetupState): WeatherSetupState {
  if (state.step === "searching") return state;

  return { step: "locating", draft: state.draft };
}

function locateFailed(state: WeatherSetupState, notice: LocateFailure): WeatherSetupState {
  if (state.step !== "locating") return state;

  return { step: "editing", draft: state.draft, notice };
}

export function weatherSetupReducer(
  state: WeatherSetupState,
  action: WeatherSetupAction,
): WeatherSetupState {
  switch (action.type) {
    case "type":
      return { step: "editing", draft: action.draft };
    case "submit":
      return submit(state);
    case "found":
    case "failed":
      return answered(state, action);
    case "locate":
      return locate(state);
    case "locate-failed":
      return locateFailed(state, action.reason);
    case "save-failed":
      return { step: "editing", draft: state.draft, error: "save-failed", place: action.place };
  }
}

export function initialWeatherSetup(
  fixture: WeatherFixture,
  search: FixtureSearch,
): WeatherSetupState {
  switch (fixture) {
    case "searching":
      return { step: "searching", draft: search.query, query: search.query };
    case "unknown":
      return { step: "editing", draft: search.unknown, error: "unknown" };
    case "choose":
      return { step: "choosing", draft: search.query, matches: search.matches };
    case "locating":
      return { step: "locating", draft: "" };
    case "denied":
    case "no-position":
    case "outside":
    case "lookup":
      return { step: "editing", draft: "", notice: fixture };
    case "savefail":
      return { step: "editing", ...search.located, error: "save-failed" };
    default:
      return { step: "editing", draft: "" };
  }
}
