import type { FixtureParams } from "@/data/repos";
import type { WeatherLocation } from "@/domain/schemas";

export type WeatherFixture = FixtureParams["wx"];

export type SetupError = "empty" | "unknown";

export type WeatherSetupState =
  | { step: "editing"; draft: string; error?: SetupError }
  | { step: "searching"; draft: string; query: string }
  | { step: "choosing"; draft: string; matches: readonly WeatherLocation[] };

export type WeatherSetupAction = { type: "type"; draft: string } | { type: "submit" };

export type FixtureSearch = {
  query: string;
  unknown: string;
  matches: readonly WeatherLocation[];
};

function submit(draft: string): WeatherSetupState {
  const query = draft.trim();

  if (query === "") return { step: "editing", draft, error: "empty" };

  return { step: "searching", draft, query };
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
