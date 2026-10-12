import type { FixtureParams } from "@/data/repos";
import type { WeatherLocation } from "@/domain/schemas";

export type WeatherFixture = FixtureParams["wx"];

export type SetupError = "empty" | "unknown" | "unavailable";

export type WeatherSetupState =
  | { step: "editing"; draft: string; error?: SetupError }
  | { step: "searching"; draft: string; query: string }
  | { step: "choosing"; draft: string; matches: readonly WeatherLocation[] };

export type WeatherSetupAction =
  | { type: "type"; draft: string }
  | { type: "submit" }
  | { type: "found"; matches: readonly WeatherLocation[] }
  | { type: "failed" };

export type FixtureSearch = {
  query: string;
  unknown: string;
  matches: readonly WeatherLocation[];
};

export function placeQuery(draft: string): string {
  return draft.trim();
}

function submit(draft: string): WeatherSetupState {
  const query = placeQuery(draft);

  if (query === "") return { step: "editing", draft, error: "empty" };

  return { step: "searching", draft, query };
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

export function weatherSetupReducer(
  state: WeatherSetupState,
  action: WeatherSetupAction,
): WeatherSetupState {
  switch (action.type) {
    case "type":
      return { step: "editing", draft: action.draft };
    case "submit":
      return submit(state.draft);
    case "found":
    case "failed":
      return answered(state, action);
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
    default:
      return { step: "editing", draft: "" };
  }
}
