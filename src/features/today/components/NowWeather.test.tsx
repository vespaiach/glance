import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import type { Weather } from "@/domain/schemas";
import { deviceTimeZone } from "@/domain/zone";
import { NowWeather } from "./NowWeather";

const tz = deviceTimeZone();

const at = (hour: number) => new Date(2026, 9, 9, hour).toISOString();

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
  hourly: [
    { time: at(11), icon: "cloud-sun", temp: 64 },
    { time: at(15), icon: "cloud-drizzle", temp: 65 },
    { time: at(16), icon: "cloud-rain", temp: 61 },
  ],
  daily: [],
} as unknown as Weather;

const DRY: Weather = {
  ...WEATHER,
  hourly: [{ time: at(11), icon: "cloud", temp: 64, precip: 80 }],
};

const ignore = () => {};

function renderWeather(props: Partial<ComponentProps<typeof NowWeather>>) {
  return render(
    <NowWeather
      tz={tz}
      retryIn={2}
      clock="12h"
      state={{ kind: "ready", data: [WEATHER] }}
      unit="F"
      onOpenWeather={ignore}
      onSetLocation={ignore}
      {...props}
    />,
  );
}

test("TODAY-08 shows the city now, the temperature, the condition with high and low, and when rain starts", () => {
  renderWeather({});

  expect(screen.getByText("Portland, OR · Now")).toBeInTheDocument();
  expect(screen.getByText("64°")).toBeInTheDocument();
  expect(screen.getByText("Partly cloudy · High 68° · Low 51°")).toBeInTheDocument();
  expect(screen.getByText("Rain from 3 PM")).toBeInTheDocument();
});

test("TODAY-01 on small the weather is one row with the temperature, high and low, and rain", () => {
  renderWeather({ small: true });

  expect(screen.getByText("64°")).toBeInTheDocument();
  expect(screen.getByText("High 68° · Low 51°")).toBeInTheDocument();
  expect(screen.getByText("Rain from 3 PM")).toBeInTheDocument();
  expect(screen.queryByText("Portland, OR · Now")).not.toBeInTheDocument();
});

test("TODAY-01 on small tapping the weather row opens Weather", async () => {
  const onOpenWeather = vi.fn<() => void>();

  renderWeather({ small: true, onOpenWeather });

  await userEvent.click(screen.getByRole("button", { name: /Weather now/ }));

  expect(onOpenWeather).toHaveBeenCalledTimes(1);
});

test("TODAY-08 with no drizzle or rain hour there is no rain line", () => {
  renderWeather({ state: { kind: "ready", data: [DRY] } });

  expect(screen.queryByText(/Rain from/)).not.toBeInTheDocument();
});

test("TIME-01 the rain hour follows the 24-hour setting", () => {
  renderWeather({ clock: "24h" });

  expect(screen.getByText("Rain from 15:00")).toBeInTheDocument();
});

test("WX-02 temperatures follow the Celsius setting", () => {
  renderWeather({ unit: "C" });

  expect(screen.getByText("18°")).toBeInTheDocument();
  expect(screen.getByText("Partly cloudy · High 20° · Low 11°")).toBeInTheDocument();
});

test("TODAY-08 tapping the weather now opens Weather", async () => {
  const onOpenWeather = vi.fn<() => void>();

  renderWeather({ onOpenWeather });

  await userEvent.click(screen.getByRole("button", { name: "Weather now" }));

  expect(onOpenWeather).toHaveBeenCalledTimes(1);
});

test("FAIL-02 saved weather after a failed fetch says when it was updated", () => {
  renderWeather({ state: { kind: "ready", data: [WEATHER], updatedAt: WEATHER.fetchedAt } });

  expect(screen.getByText(/^Portland, OR · Updated /)).toBeInTheDocument();
});

test("TODAY-08 with no location Set weather location goes to the weather setup", async () => {
  const onSetLocation = vi.fn<() => void>();

  renderWeather({ state: { kind: "empty" }, onSetLocation });

  expect(screen.getByText("The forecast and the clock follow it.")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Set weather location/ }));

  expect(onSetLocation).toHaveBeenCalledTimes(1);
});

test("TODAY-08 a failed forecast says when it tries again, with no button", () => {
  renderWeather({ state: { kind: "failed" } });

  expect(screen.getByText("Weather unavailable")).toBeInTheDocument();
  expect(screen.getByText("Trying again in 2 min.")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("LOAD-02 weather still loading shows a skeleton", () => {
  renderWeather({ state: { kind: "loading" } });

  expect(screen.getByRole("status", { name: "Loading weather" })).toBeInTheDocument();
});
