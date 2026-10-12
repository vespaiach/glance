import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createSettingsRepo, type FixtureParams } from "@/data/repos";
import { type Harness, openHarness, putSyncStatus } from "@/data/repos/testHarness";
import type { Weather, WeatherLocation } from "@/domain/schemas";
import { FixtureParamsProvider } from "@/shell/fixtureOptions";
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

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-weather-screen-test");

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

function renderWeather(params: FixtureParams = {}) {
  const Shell = shellWrapper(store, { frozenAt: NOW });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <NetworkProvider>
        <FixtureParamsProvider params={params}>{children}</FixtureParamsProvider>
      </NetworkProvider>
    </Shell>
  );

  return render(<WeatherScreen />, { wrapper });
}

test("WX-04 with no location the view asks where the screen is", async () => {
  renderWeather();

  expect(await screen.findByText("Where is this screen?")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show weather" })).toBeInTheDocument();
});

test("WX-09 wx=choose opens the setup on the Portland matches", async () => {
  renderWeather({ wx: "choose" });

  expect(await screen.findByText("2 places called Portland")).toBeInTheDocument();
  expect(screen.getByLabelText("City or ZIP code")).toHaveValue("Portland");
});

test("WX-08 wx=unknown opens the setup on the unknown place", async () => {
  renderWeather({ wx: "unknown" });

  expect(await screen.findByLabelText("City or ZIP code")).toHaveValue("Pordland");
});

test("WX-01 with a location and a saved forecast the view shows it", async () => {
  await locate();
  await store.db.weather.put({ ...WEATHER, accountId: store.accountId });

  renderWeather();

  expect(await screen.findByText("Portland, OR · Now")).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "Next 8 hours" })).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "7-day forecast" })).toBeInTheDocument();
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

test("WX-03 offline the saved forecast says when it is from", async () => {
  await locate();
  await store.db.weather.put({ ...WEATHER, accountId: store.accountId });
  await putSyncStatus(store, { online: false, weather: { state: "idle" } });

  renderWeather();

  expect(await screen.findByText("Forecast from 10:30 AM")).toBeInTheDocument();
});
