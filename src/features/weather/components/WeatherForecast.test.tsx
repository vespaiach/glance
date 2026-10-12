import { render, screen, within } from "@testing-library/react";
import type { Weather } from "@/domain/schemas";
import { WeatherForecast } from "./WeatherForecast";

const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 9, day, hour, minute).toISOString();

const PRECIP = [10, 10, 20, 30, 40, 70, 80, 40];

const DAILY: Weather["daily"] = [
  { date: "2026-10-09", icon: "cloud-sun", high: 68, low: 51, precip: 20 },
  { date: "2026-10-10", icon: "cloud-rain", high: 59, low: 48, precip: 80 },
  { date: "2026-10-11", icon: "cloud", high: 61, low: 47, precip: 30 },
  { date: "2026-10-12", icon: "sun", high: 66, low: 49 },
  { date: "2026-10-13", icon: "sun", high: 69, low: 50 },
  { date: "2026-10-14", icon: "cloud-sun", high: 65, low: 50, precip: 10 },
  { date: "2026-10-15", icon: "cloud-lightning", high: 58, low: 46, precip: 70 },
];

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
  hourly: PRECIP.map((precip, index) => ({
    time: at(9, 11 + index),
    icon: "cloud",
    temp: 64 + index,
    precip,
  })),
  daily: DAILY,
};

const DRY: Weather = {
  ...WEATHER,
  hourly: WEATHER.hourly.map((point) => ({ ...point, precip: 10 })),
};

const TODAY = new Date(2026, 9, 9, 10, 41);

const base = {
  weather: WEATHER,
  unit: "F",
  clock: "12h",
  today: TODAY,
  offline: false,
  breakpoint: "wide",
} as const;

test("WX-01 the now block is named after the location and shows four details", () => {
  render(<WeatherForecast {...base} />);

  expect(screen.getByText("Portland, OR · Now")).toBeInTheDocument();
  expect(screen.getByText("Partly cloudy")).toBeInTheDocument();
  expect(screen.getByText("H 68° · L 51° · Feels like 62°")).toBeInTheDocument();
  expect(screen.getByText("Wind")).toBeInTheDocument();
  expect(screen.getByText("8 mph NW")).toBeInTheDocument();
  expect(screen.getByText("62%")).toBeInTheDocument();
  expect(screen.getByText("UV index")).toBeInTheDocument();
  expect(screen.getByText("6:42 PM")).toBeInTheDocument();
});

test("WX-01 lists the next 8 hours with time and temperature", () => {
  render(<WeatherForecast {...base} />);

  const hours = within(screen.getByRole("list", { name: "Next 8 hours" })).getAllByRole("listitem");

  expect(hours).toHaveLength(8);
  expect(hours[0]).toHaveTextContent("11 AM64°");
  expect(hours[7]).toHaveTextContent("6 PM71°");
});

test("WX-01 the 7-day forecast highlights today and shows precip only when present", () => {
  render(<WeatherForecast {...base} />);

  const days = within(screen.getByRole("list", { name: "7-day forecast" })).getAllByRole(
    "listitem",
  );

  expect(days).toHaveLength(7);
  expect(days[0]).toHaveTextContent("Today68°51°20%");
  expect(days[1]).toHaveTextContent("Sat59°48°80%");
  expect(days[3]).toHaveTextContent("Mon66°49°");
  expect(days[3]).not.toHaveTextContent("%");
});

test("WX-02 every value follows the Celsius setting", () => {
  render(<WeatherForecast {...base} unit="C" />);

  expect(screen.getByText("H 20° · L 11° · Feels like 17°")).toBeInTheDocument();
  expect(screen.getByText("13 km/h NW")).toBeInTheDocument();
  expect(screen.queryByText("64°")).not.toBeInTheDocument();
});

test("TIME-01 hours and sunset follow the 24-hour clock", () => {
  render(<WeatherForecast {...base} clock="24h" />);

  expect(screen.getByText("18:42")).toBeInTheDocument();
  expect(screen.getByText("11:00")).toBeInTheDocument();
});

test("WX-03 rain in the next 8 hours shows when it moves in", () => {
  render(<WeatherForecast {...base} />);

  expect(screen.getByText("Rain moving in after 4 PM")).toBeInTheDocument();
  expect(screen.getByText("Grab an umbrella if you’re heading out.")).toBeInTheDocument();
});

test("WX-03 no banner when the next 8 hours stay dry", () => {
  render(<WeatherForecast {...base} weather={DRY} />);

  expect(screen.queryByText(/Rain moving in/)).not.toBeInTheDocument();
});

test("WX-03 offline shows when the forecast is from instead of the rain banner", () => {
  render(<WeatherForecast {...base} offline />);

  expect(screen.getByText("Forecast from 10:30 AM")).toBeInTheDocument();
  expect(
    screen.getByText("Updates when the screen is back online. Conditions may have changed."),
  ).toBeInTheDocument();
  expect(screen.queryByText(/Rain moving in/)).not.toBeInTheDocument();
});
