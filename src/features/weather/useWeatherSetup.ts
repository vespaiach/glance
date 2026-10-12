"use client";

import { useReducer, useRef } from "react";
import { useSettingsRepo, useWeatherRepo } from "@/data/repos";
import type { WeatherLocation } from "@/domain/schemas";
import { placeQuery, type WeatherSetupState, weatherSetupReducer } from "./weatherSetup";

export type WeatherSetupFlow = {
  state: WeatherSetupState;
  type(draft: string): void;
  submit(): void;
  pick(place: WeatherLocation): void;
};

export function useWeatherSetup(initial: () => WeatherSetupState): WeatherSetupFlow {
  const weather = useWeatherRepo();

  const settings = useSettingsRepo();

  const searchId = useRef(0);

  const [state, dispatch] = useReducer(weatherSetupReducer, undefined, initial);

  const pick = (place: WeatherLocation) => void settings.update({ weatherLocation: place });

  const search = async (query: string) => {
    const id = ++searchId.current;

    const answer = await weather.searchPlaces(query);

    if (id !== searchId.current) return;

    const [only] = answer.ok && answer.value.length === 1 ? answer.value : [];

    if (only) pick(only);

    dispatch(answer.ok ? { type: "found", matches: answer.value } : { type: "failed" });
  };

  const type = (draft: string) => {
    searchId.current += 1;

    dispatch({ type: "type", draft });
  };

  const submit = () => {
    const query = placeQuery(state.draft);

    dispatch({ type: "submit" });

    if (query !== "") void search(query);
  };

  return { state, type, submit, pick };
}
