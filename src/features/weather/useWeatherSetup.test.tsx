import { act, renderHook, waitFor } from "@testing-library/react";
import type { DevicePosition } from "@/data/repos";
import { err, ok, type Result } from "@/domain/result";
import type { WeatherLocation } from "@/domain/schemas";
import { type SetupSource, useWeatherSetup } from "./useWeatherSetup";
import type { WeatherSetupState } from "./weatherSetup";

const PORTLAND: WeatherLocation = {
  name: "Portland",
  region: "Oregon",
  lat: 45.52,
  lon: -122.68,
  timeZone: "America/Los_Angeles",
};

const MAINE: WeatherLocation = {
  name: "Portland",
  region: "Maine",
  lat: 43.66,
  lon: -70.26,
  timeZone: "America/New_York",
};

const askEastern = (place: WeatherLocation) => place.timeZone === "America/New_York";

const COORDS = { lat: 45.5152, lon: -122.6784 };

const EMPTY: WeatherSetupState = { step: "editing", draft: "" };

function setup(
  options: {
    initial?: WeatherSetupState;
    source?: Partial<SetupSource>;
    save?: (place: WeatherLocation) => Promise<boolean>;
    position?: Partial<DevicePosition>;
    asksZone?: (place: WeatherLocation) => boolean;
  } = {},
) {
  const source: SetupSource = {
    searchPlaces: vi.fn(async () => err("network" as const)),
    locate: vi.fn(async () => ok(PORTLAND)),
    ...options.source,
  };

  const save = vi.fn(options.save ?? (async () => true));

  const position: DevicePosition = {
    available: async () => true,
    current: async () => ok(COORDS),
    ...options.position,
  };

  const hook = renderHook(() =>
    useWeatherSetup({
      initial: () => options.initial ?? EMPTY,
      source,
      save,
      position,
      ...(options.asksZone && { asksZone: options.asksZone }),
    }),
  );

  return { ...hook, source, save };
}

function pending<T>() {
  let resolve: (value: T) => void = () => {};

  const promise = new Promise<T>((done) => (resolve = done));

  return { promise, resolve };
}

afterEach(() => {
  vi.useRealTimers();
});

test("LOC-01 Use my location shows once the device can locate itself", async () => {
  const { result } = setup();

  await waitFor(() => expect(result.current.canLocate).toBe(true));
});

test("LOC-01 Use my location stays hidden when the device can't locate itself", async () => {
  const { result } = setup({ position: { available: async () => false } });

  await act(async () => {});

  expect(result.current.canLocate).toBe(false);
});

test("LOC-01 the place found from the position is saved at once", async () => {
  const { result, source, save } = setup();

  act(() => result.current.locate());

  expect(result.current.state).toEqual({ step: "locating", draft: "" });
  await waitFor(() => expect(save).toHaveBeenCalledWith(PORTLAND));
  expect(source.locate).toHaveBeenCalledWith(COORDS);
  expect(result.current.state.step).toBe("locating");
});

test("LOC-03 a denied permission shows its notice and hides Use my location", async () => {
  const { result } = setup({ position: { current: async () => err("denied" as const) } });

  await waitFor(() => expect(result.current.canLocate).toBe(true));

  await act(async () => result.current.locate());

  expect(result.current.state).toEqual({ step: "editing", draft: "", notice: "denied" });
  expect(result.current.canLocate).toBe(false);

  act(() => result.current.type("P"));

  expect(result.current.canLocate).toBe(false);
});

test("LOC-03 wx=denied starts with Use my location hidden", async () => {
  const { result } = setup({ initial: { step: "editing", draft: "", notice: "denied" } });

  await act(async () => {});

  expect(result.current.canLocate).toBe(false);
});

test("LOC-03 no position shows its notice", async () => {
  const { result } = setup({ position: { current: async () => err("no-position" as const) } });

  await act(async () => result.current.locate());

  expect(result.current.state).toEqual({ step: "editing", draft: "", notice: "no-position" });
});

test("LOC-03 a position outside the US shows its notice", async () => {
  const { result } = setup({ source: { locate: async () => err("outside" as const) } });

  await act(async () => result.current.locate());

  expect(result.current.state).toEqual({ step: "editing", draft: "", notice: "outside" });
});

test.each(["network", "server"] as const)(
  "LOC-03 a %s answer to the lookup is a lookup failure",
  async (error) => {
    const { result } = setup({ source: { locate: async () => err(error) } });

    await act(async () => result.current.locate());

    expect(result.current.state).toEqual({ step: "editing", draft: "", notice: "lookup" });
  },
);

test("LOC-02 a lookup that takes over 5 s is a lookup failure and its late answer is dropped", async () => {
  vi.useFakeTimers();

  const lookup = pending<Result<WeatherLocation, "outside">>();

  const { result, save } = setup({ source: { locate: () => lookup.promise } });

  await act(async () => result.current.locate());

  await act(async () => vi.advanceTimersByTime(5_000));

  expect(result.current.state).toEqual({ step: "editing", draft: "", notice: "lookup" });

  await act(async () => lookup.resolve(ok(PORTLAND)));

  expect(save).not.toHaveBeenCalled();
});

test("LOC-02 typing cancels locating and drops the late place", async () => {
  const position = pending<Result<typeof COORDS, "denied">>();

  const { result, save } = setup({ position: { current: () => position.promise } });

  act(() => result.current.locate());

  act(() => result.current.type("P"));

  await act(async () => position.resolve(ok(COORDS)));

  expect(result.current.state).toEqual({ step: "editing", draft: "P" });
  expect(save).not.toHaveBeenCalled();
});

test("LOC-02 leaving the page cancels locating", async () => {
  const position = pending<Result<typeof COORDS, "denied">>();

  const { result, save, unmount } = setup({ position: { current: () => position.promise } });

  act(() => result.current.locate());

  unmount();

  await act(async () => position.resolve(ok(COORDS)));

  expect(save).not.toHaveBeenCalled();
});

test("tech§4.4 a failed save keeps the found place and the primary saves it again", async () => {
  const { result, save } = setup({ save: async () => false });

  await act(async () => result.current.locate());

  expect(result.current.state).toEqual({
    step: "editing",
    draft: "",
    error: "save-failed",
    place: PORTLAND,
  });

  await act(async () => result.current.submit());

  expect(save).toHaveBeenCalledTimes(2);
  expect(save).toHaveBeenLastCalledWith(PORTLAND);
});

test("WX-09 a single search match is saved", async () => {
  const { result, save } = setup({
    initial: { step: "editing", draft: "97214" },
    source: { searchPlaces: async () => ok([PORTLAND]) },
  });

  await act(async () => result.current.submit());

  expect(save).toHaveBeenCalledWith(PORTLAND);
});

test("WX-09 picking a match saves it", async () => {
  const { result, save } = setup();

  await act(async () => result.current.pick(PORTLAND));

  expect(save).toHaveBeenCalledWith(PORTLAND);
});

test("LOC-09 a picked place in another zone asks instead of saving", async () => {
  const { result, save } = setup({
    initial: { step: "choosing", draft: "Portland", matches: [PORTLAND, MAINE] },
    asksZone: askEastern,
  });

  act(() => result.current.pick(MAINE));

  expect(result.current.state).toEqual({ step: "confirm-zone", draft: "Portland", place: MAINE });
  expect(save).not.toHaveBeenCalled();
});

test("LOC-09 a picked place in the same zone saves at once", async () => {
  const { result, save } = setup({
    initial: { step: "choosing", draft: "Portland", matches: [PORTLAND, MAINE] },
    asksZone: askEastern,
  });

  act(() => result.current.pick(PORTLAND));

  await waitFor(() => expect(save).toHaveBeenCalledWith(PORTLAND));
});

test("LOC-09 a single match in another zone asks too", async () => {
  const { result, save } = setup({
    source: { searchPlaces: async () => ok([MAINE]) },
    asksZone: askEastern,
  });

  act(() => result.current.type("04101"));
  act(() => result.current.submit());

  await waitFor(() =>
    expect(result.current.state).toEqual({ step: "confirm-zone", draft: "04101", place: MAINE }),
  );
  expect(save).not.toHaveBeenCalled();
});

test("LOC-09 a located place in another zone asks too", async () => {
  const { result, save } = setup({
    source: { locate: async () => ok(MAINE) },
    asksZone: askEastern,
  });

  await act(async () => result.current.locate());

  expect(result.current.state).toEqual({ step: "confirm-zone", draft: "", place: MAINE });
  expect(save).not.toHaveBeenCalled();
});

test("LOC-09 Switch saves the asked place", async () => {
  const { result, save } = setup({
    initial: { step: "confirm-zone", draft: "Portland", place: MAINE },
  });

  act(() => result.current.confirm());

  await waitFor(() => expect(save).toHaveBeenCalledWith(MAINE));
});

test("LOC-09 a failed Switch returns to the card with the place kept", async () => {
  const { result } = setup({
    initial: { step: "confirm-zone", draft: "Portland", place: MAINE },
    save: async () => false,
  });

  await act(async () => result.current.confirm());

  expect(result.current.state).toEqual({
    step: "editing",
    draft: "Portland",
    error: "save-failed",
    place: MAINE,
  });
});

test("LOC-09 Keep goes back to the card with the draft", () => {
  const { result, save } = setup({
    initial: { step: "confirm-zone", draft: "Portland", place: MAINE },
  });

  act(() => result.current.keep());

  expect(result.current.state).toEqual({ step: "editing", draft: "Portland" });
  expect(save).not.toHaveBeenCalled();
});
