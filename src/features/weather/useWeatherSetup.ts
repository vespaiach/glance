"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import {
  type DevicePosition,
  devicePosition,
  type LocateError,
  type WeatherRepo,
} from "@/data/repos";
import { err, type Result } from "@/domain/result";
import type { WeatherLocation } from "@/domain/schemas";
import {
  type LocateFailure,
  placeQuery,
  type WeatherSetupState,
  weatherSetupReducer,
} from "./weatherSetup";

export type SetupSource = Pick<WeatherRepo, "searchPlaces" | "locate">;

export type WeatherSetupOptions = {
  initial: () => WeatherSetupState;
  source: SetupSource;
  save: (place: WeatherLocation) => Promise<boolean>;
  position?: DevicePosition;
  asksZone?: (place: WeatherLocation) => boolean;
};

export type WeatherSetupFlow = {
  state: WeatherSetupState;
  canLocate: boolean;
  type(draft: string): void;
  submit(): void;
  pick(place: WeatherLocation): void;
  locate(): void;
  confirm(): void;
  keep(): void;
  skip(end: () => Promise<boolean>): void;
};

const NEVER_ASKS = () => false;

const LOOKUP_LIMIT_MS = 5_000;

export function useWeatherSetup({
  initial,
  source,
  save,
  position = devicePosition,
  asksZone = NEVER_ASKS,
}: WeatherSetupOptions): WeatherSetupFlow {
  const requestId = useRef(0);

  const [state, dispatch] = useReducer(weatherSetupReducer, undefined, initial);

  const [denied, setDenied] = useState(() => state.step === "editing" && state.notice === "denied");

  const available = useAvailable(position);

  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );

  const commit = async (place: WeatherLocation) => {
    const id = requestId.current;

    const saved = await save(place);

    if (!saved && id === requestId.current) dispatch({ type: "save-failed", place });
  };

  const settle = (place: WeatherLocation) => {
    if (asksZone(place)) dispatch({ type: "ask-zone", place });
    else void commit(place);
  };

  const search = async (query: string) => {
    const id = ++requestId.current;

    const answer = await source.searchPlaces(query);

    if (id !== requestId.current) return;

    dispatch(answer.ok ? { type: "found", matches: answer.value } : { type: "failed" });

    const [only] = answer.ok && answer.value.length === 1 ? answer.value : [];

    if (only) settle(only);
  };

  const locate = async () => {
    const id = ++requestId.current;

    dispatch({ type: "locate" });

    const place = await placeAt(source, position);

    if (id !== requestId.current) return;

    if (place.ok) return settle(place.value);

    if (place.error === "denied") setDenied(true);

    dispatch({ type: "locate-failed", reason: place.error });
  };

  const skip = async (end: () => Promise<boolean>) => {
    const id = ++requestId.current;

    dispatch({ type: "cancel" });

    const ended = await end();

    if (!ended && id === requestId.current) dispatch({ type: "skip-failed" });
  };

  const type = (draft: string) => {
    requestId.current += 1;

    dispatch({ type: "type", draft });
  };

  const submit = () => {
    const kept = state.step === "editing" ? state.place : undefined;

    const query = placeQuery(state.draft);

    dispatch({ type: "submit" });

    if (kept) void commit(kept);
    else if (query !== "") void search(query);
  };

  return {
    state,
    canLocate: available && !denied,
    type,
    submit,
    pick: settle,
    locate: () => void locate(),
    confirm: () => {
      if (state.step === "confirm-zone") void commit(state.place);
    },
    keep: () => dispatch({ type: "keep" }),
    skip: (end) => void skip(end),
  };
}

function lookupFailure(error: LocateError): LocateFailure {
  return error === "outside" ? "outside" : "lookup";
}

function withinLimit(
  answer: Promise<Result<WeatherLocation, LocateError>>,
): Promise<Result<WeatherLocation, LocateError>> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const limit = new Promise<Result<WeatherLocation, LocateError>>((resolve) => {
    timer = setTimeout(() => resolve(err("network")), LOOKUP_LIMIT_MS);
  });

  return Promise.race([answer, limit]).finally(() => clearTimeout(timer));
}

async function placeAt(
  source: SetupSource,
  position: DevicePosition,
): Promise<Result<WeatherLocation, LocateFailure>> {
  const coords = await position.current();

  if (!coords.ok) return coords;

  const answer = await withinLimit(source.locate(coords.value));

  return answer.ok ? answer : err(lookupFailure(answer.error));
}

function useAvailable(position: DevicePosition): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let live = true;

    void position.available().then((answer) => live && setAvailable(answer));

    return () => {
      live = false;
    };
  }, [position]);

  return available;
}
