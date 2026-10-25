import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createSettingsRepo } from "@/data/repos";
import { type Harness, markSynced, openHarness, putSyncStatus } from "@/data/repos/testHarness";
import { err, ok } from "@/domain/result";
import type { Weather, WeatherLocation } from "@/domain/schemas";
import { NetworkProvider } from "@/shell/providers/network";
import { shellWrapper } from "@/shell/providers/testShell";
import { WeatherScreen } from "./WeatherScreen";

const NOW = new Date(2026, 9, 9, 10, 41);

const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 9, day, hour, minute).toISOString();

const PORTLAND: WeatherLocation = {
  name: "Portland",
  region: "Oregon",
  lat: 45.5152,
  lon: -122.6784,
};

const WEATHER: Weather = {
  location: "Portland, OR",
  fetchedAt: at(9, 10, 30),
  current: {
    temp: 64,
    condition: "partlyCloudy",
    icon: "cloud-sun",
    high: 68,
    low: 51,
    feelsLike: 62,
    windMph: 8,
    windDir: "NW",
    humidity: 62,
    uv: 3,
    sunset: at(9, 18, 42),
  },
  hourly: Array.from({ length: 8 }, (_, index) => ({
    time: at(9, 11 + index),
    icon: "cloud" as const,
    temp: 64,
  })),
  daily: Array.from({ length: 7 }, (_, index) => ({
    date: `2026-10-${String(9 + index).padStart(2, "0")}`,
    icon: "sun" as const,
    high: 68,
    low: 51,
  })),
};

const MAINE: WeatherLocation = { name: "Portland", region: "Maine", lat: 43.6591, lon: -70.2568 };

let store: Harness;

beforeEach(async () => {
  store = openHarness("glance-weather-screen-test");

  await markSynced(store);

  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();

  await store.close();
});

async function locate() {
  await createSettingsRepo(store).update({ weatherLocation: PORTLAND });
}

function renderWeather() {
  const Shell = shellWrapper(store, { frozenAt: NOW });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <NetworkProvider>{children}</NetworkProvider>
    </Shell>
  );

  return render(<WeatherScreen />, { wrapper });
}

test("WX-04 with no location the view asks where the screen is", async () => {
  renderWeather();

  expect(await screen.findByText("Where is this screen?")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show weather" })).toBeInTheDocument();
});

test("WX-01 with a location and a saved forecast the view shows it", async () => {
  await locate();
  await store.db.weather.put({ ...WEATHER, accountId: store.accountId });

  renderWeather();

  expect(await screen.findByText("Portland, OR · Now")).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "Next 8 hours" })).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "7-day forecast" })).toBeInTheDocument();
});

test("WX-10 the forecast credits Open-Meteo with a link that opens in a new tab", async () => {
  await locate();
  await store.db.weather.put({ ...WEATHER, accountId: store.accountId });

  renderWeather();

  const link = await screen.findByRole("link", { name: "Weather data by Open-Meteo.com" });

  expect(link).toHaveAttribute("href", "https://open-meteo.com/");
  expect(link).toHaveAttribute("target", "_blank");
  expect(link.getAttribute("rel")).toContain("noopener");
});

test("WX-10 the setup state shows no Open-Meteo credit", async () => {
  renderWeather();

  expect(await screen.findByText("Where is this screen?")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Weather data by Open-Meteo.com" })).toBeNull();
});

test("WX-05 with a location and no forecast yet the view is loading", async () => {
  await locate();

  renderWeather();

  expect(await screen.findByRole("status", { name: "Loading weather" })).toBeInTheDocument();
});

test("WX-05 a failed fetch with no forecast shows the retry countdown", async () => {
  await locate();
  await putSyncStatus(store, {
    online: true,
    weather: { state: "failed", retryAt: new Date(2026, 9, 9, 10, 42, 30).toISOString() },
  });

  renderWeather();

  expect(await screen.findByText("Weather unavailable")).toBeInTheDocument();
  expect(
    screen.getByText("The forecast service isn’t responding. Trying again in 2 min."),
  ).toBeInTheDocument();
  expect(screen.getByText("Portland, Oregon")).toBeInTheDocument();
});

test("WX-10 the failed state shows no Open-Meteo credit", async () => {
  await locate();
  await putSyncStatus(store, {
    online: true,
    weather: { state: "failed", retryAt: new Date(2026, 9, 9, 10, 42).toISOString() },
  });

  renderWeather();

  expect(await screen.findByText("Weather unavailable")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Weather data by Open-Meteo.com" })).toBeNull();
});

test("WX-05 Try again refreshes the weather now", async () => {
  await locate();
  await putSyncStatus(store, {
    online: true,
    weather: { state: "failed", retryAt: new Date(2026, 9, 9, 10, 42).toISOString() },
  });

  renderWeather();

  await userEvent.click(await screen.findByRole("button", { name: "Try again" }));

  expect(store.refreshWeather).toHaveBeenCalledTimes(1);
});

test("FAIL-02 a saved forecast after a failed fetch says when it was updated", async () => {
  await locate();
  await store.db.weather.put({ ...WEATHER, accountId: store.accountId });
  await putSyncStatus(store, {
    online: true,
    weather: { state: "failed", retryAt: new Date(2026, 9, 9, 10, 42).toISOString() },
  });

  renderWeather();

  expect(await screen.findByText("Portland, OR · Now · Updated 10:30 AM")).toBeInTheDocument();
});

test("OFF-03 offline a forecast over an hour old says when it is from", async () => {
  await locate();
  await store.db.weather.put({ ...WEATHER, fetchedAt: at(9, 9, 32), accountId: store.accountId });
  await putSyncStatus(store, { online: false, weather: { state: "idle" } });

  renderWeather();

  expect(await screen.findByText("Forecast from 9:32 AM")).toBeInTheDocument();
});

test("OFF-03 offline a forecast under an hour old has no Forecast from banner", async () => {
  await locate();
  await store.db.weather.put({ ...WEATHER, accountId: store.accountId });
  await putSyncStatus(store, { online: false, weather: { state: "idle" } });

  renderWeather();

  expect(await screen.findByText("Partly cloudy")).toBeInTheDocument();
  expect(screen.queryByText(/Forecast from/)).not.toBeInTheDocument();
});

async function search(query: string) {
  await userEvent.type(await screen.findByLabelText("City or ZIP code"), query);
  await userEvent.click(screen.getByRole("button", { name: "Show weather" }));
}

async function savedLocation() {
  return (await store.db.settings.get(store.accountId))?.weatherLocation;
}

test("WX-07 Show weather searches for the trimmed query", async () => {
  store.places.mockReturnValue(new Promise(() => {}));

  renderWeather();

  await search("  Portland ");

  expect(store.places).toHaveBeenCalledWith("Portland");
  expect(screen.getByRole("status")).toHaveTextContent("Looking for Portland…");
});

test("WX-09 tapping a match saves it as the location, with no extra confirm", async () => {
  store.places.mockResolvedValue(ok([PORTLAND, MAINE]));

  renderWeather();

  await search("Portland");

  await userEvent.click(
    await screen.findByRole("button", { name: /^Portland\s*Maine, United States$/ }),
  );

  await waitFor(async () => expect(await savedLocation()).toEqual(MAINE));
  expect(store.nudge).toHaveBeenCalled();
  expect(await screen.findByRole("status", { name: "Loading weather" })).toBeInTheDocument();
});

test("WX-09 a single match is saved without a list", async () => {
  store.places.mockResolvedValue(ok([PORTLAND]));

  renderWeather();

  await search("97214");

  await waitFor(async () => expect(await savedLocation()).toEqual(PORTLAND));
  expect(screen.queryByText(/places called/)).not.toBeInTheDocument();
});

test("WX-08 no match shows the unknown-place error on the input", async () => {
  store.places.mockResolvedValue(ok([]));

  renderWeather();

  await search("Pordland");

  await waitFor(() =>
    expect(screen.getByLabelText("City or ZIP code")).toHaveAccessibleDescription(
      "We couldn’t find that place. Try a city and state, like Austin, TX",
    ),
  );
  expect(await savedLocation()).toBeUndefined();
});

test("WX-07 a failed search says place search isn't responding", async () => {
  store.places.mockResolvedValue(err("network"));

  renderWeather();

  await search("Portland");

  await waitFor(() =>
    expect(screen.getByLabelText("City or ZIP code")).toHaveAccessibleDescription(
      "Place search isn’t responding. Try again in a moment.",
    ),
  );
});

test("WX-07 typing during the search ignores its answer", async () => {
  let answer: (places: WeatherLocation[]) => void = () => {};

  store.places.mockReturnValue(
    new Promise((resolve) => (answer = (places) => resolve(ok(places)))),
  );

  renderWeather();

  await search("97214");

  await userEvent.type(screen.getByLabelText("City or ZIP code"), "5");

  answer([PORTLAND]);

  await new Promise((resolve) => setTimeout(resolve, 20));

  expect(await savedLocation()).toBeUndefined();
  expect(screen.getByRole("button", { name: "Show weather" })).toBeInTheDocument();
});

function stubDevicePosition() {
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("navigator", {
    onLine: true,
    geolocation: {
      getCurrentPosition: (
        success: (position: { coords: { latitude: number; longitude: number } }) => void,
      ) => success({ coords: { latitude: 45.5152, longitude: -122.6784 } }),
    },
  });
}

test("LOC-01 Use my location saves the place found and loads its forecast", async () => {
  stubDevicePosition();
  store.locate.mockResolvedValue(ok(PORTLAND));

  renderWeather();

  await userEvent.click(await screen.findByRole("button", { name: "Use my location" }));

  await waitFor(async () => expect(await savedLocation()).toEqual(PORTLAND));
  expect(store.locate).toHaveBeenCalledWith({ lat: 45.5152, lon: -122.6784 });
  expect(await screen.findByRole("status", { name: "Loading weather" })).toBeInTheDocument();
});

test("LOC-03 a lookup the server can't answer keeps the card with the lookup notice", async () => {
  stubDevicePosition();

  renderWeather();

  await userEvent.click(await screen.findByRole("button", { name: "Use my location" }));

  expect(
    await screen.findByText("Couldn’t look up this place. Try again, or type a city or ZIP."),
  ).toBeInTheDocument();
  expect(await savedLocation()).toBeUndefined();
});
