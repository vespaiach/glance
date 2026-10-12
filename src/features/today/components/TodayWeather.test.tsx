import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Weather } from "@/domain/schemas";
import { deviceTimeZone } from "@/domain/zone";
import { TodayWeather } from "./TodayWeather";

const tz = deviceTimeZone();

const WEATHER = {
  location: "Portland, OR",
  fetchedAt: "2026-10-09T17:30:00.000Z",
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
    sunset: "2026-10-10T01:42:00.000Z",
  },
  hourly: [],
  daily: [],
} as unknown as Weather;

test("TODAY-08 shows location, temperature, condition words, high/low and feels like", () => {
  render(
    <TodayWeather
      tz={tz}
      retryIn={1}
      onRetry={() => {}}
      clock="12h"
      state={{ kind: "ready", data: [WEATHER] }}
      unit="F"
      onSetLocation={() => {}}
    />,
  );

  expect(screen.getByText("Portland, OR")).toBeInTheDocument();
  expect(screen.getByText("64°")).toBeInTheDocument();
  expect(screen.getByText("Partly cloudy")).toBeInTheDocument();
  expect(screen.getByText("H 68° · L 51° · Feels like 62°")).toBeInTheDocument();
});

test("WX-02 temperatures follow the Celsius setting", () => {
  render(
    <TodayWeather
      tz={tz}
      retryIn={1}
      onRetry={() => {}}
      clock="12h"
      state={{ kind: "ready", data: [WEATHER] }}
      unit="C"
      onSetLocation={() => {}}
    />,
  );

  expect(screen.getByText("18°")).toBeInTheDocument();
  expect(screen.getByText("H 20° · L 11° · Feels like 17°")).toBeInTheDocument();
});

test("TODAY-08 with no location Set location goes to Weather", async () => {
  const onSetLocation = vi.fn<() => void>();

  render(
    <TodayWeather
      tz={tz}
      retryIn={1}
      onRetry={() => {}}
      clock="12h"
      state={{ kind: "empty" }}
      unit="F"
      onSetLocation={onSetLocation}
    />,
  );

  expect(screen.getByText("Weather needs a location")).toBeInTheDocument();
  expect(screen.getByText("Set the city once and the forecast stays current.")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Set location" }));

  expect(onSetLocation).toHaveBeenCalledTimes(1);
});

test("LOAD-02 weather still loading shows a skeleton", () => {
  render(
    <TodayWeather
      tz={tz}
      retryIn={1}
      onRetry={() => {}}
      clock="12h"
      state={{ kind: "loading" }}
      unit="F"
      onSetLocation={() => {}}
    />,
  );

  expect(screen.getByRole("status", { name: "Loading weather" })).toBeInTheDocument();
});
