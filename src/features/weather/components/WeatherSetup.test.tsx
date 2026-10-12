import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { WeatherLocation } from "@/domain/schemas";
import type { WeatherSetupState } from "../weatherSetup";
import { WeatherSetup } from "./WeatherSetup";

const PORTLANDS: WeatherLocation[] = [
  { name: "Portland", region: "Oregon", lat: 45.5152, lon: -122.6784 },
  { name: "Portland", region: "Maine", lat: 43.6591, lon: -70.2568 },
];

const EMPTY: WeatherSetupState = { step: "editing", draft: "" };

test("WX-04 asks where the screen is, with the city field and Show weather", () => {
  render(<WeatherSetup initial={EMPTY} />);

  expect(screen.getByText("Weather · setup")).toBeInTheDocument();
  expect(screen.getByText("Where is this screen?")).toBeInTheDocument();
  expect(
    screen.getByText("The forecast on Today, Weather and the ambient screen uses this location."),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("City or ZIP code")).toHaveAttribute("placeholder", "Portland, OR");
  expect(screen.getByRole("button", { name: "Show weather" })).toBeInTheDocument();
});

test("WX-04 Show weather with an empty field asks for a city or ZIP code", async () => {
  render(<WeatherSetup initial={EMPTY} />);

  await userEvent.click(screen.getByRole("button", { name: "Show weather" }));

  expect(screen.getByLabelText("City or ZIP code")).toHaveAccessibleDescription(
    "Enter a city or ZIP code",
  );
});

test("WX-07 Show weather replaces the button with the search status", async () => {
  render(<WeatherSetup initial={EMPTY} />);

  await userEvent.type(screen.getByLabelText("City or ZIP code"), "Portland");
  await userEvent.click(screen.getByRole("button", { name: "Show weather" }));

  expect(screen.getByRole("status")).toHaveTextContent("Looking for Portland…");
  expect(screen.queryByRole("button", { name: "Show weather" })).not.toBeInTheDocument();
});

test("WX-07 typing cancels the search and brings back Show weather", async () => {
  render(<WeatherSetup initial={{ step: "searching", draft: "Portland", query: "Portland" }} />);

  await userEvent.type(screen.getByLabelText("City or ZIP code"), "s");

  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show weather" })).toBeInTheDocument();
});

test("WX-08 an unknown place shows the error on the input until the next keystroke", async () => {
  render(<WeatherSetup initial={{ step: "editing", draft: "Pordland", error: "unknown" }} />);

  const input = screen.getByLabelText("City or ZIP code");

  expect(input).toHaveAccessibleDescription(
    "We couldn’t find that place. Try a city and state, like Austin, TX",
  );

  await userEvent.type(input, "x");

  expect(input).not.toHaveAccessibleDescription();
});

test("WX-09 several matches list one row per place under a count", () => {
  render(<WeatherSetup initial={{ step: "choosing", draft: "Portland", matches: PORTLANDS }} />);

  expect(screen.getByText("2 places called Portland")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /^Portland\s*Oregon, United States$/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /^Portland\s*Maine, United States$/ }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Show weather" })).not.toBeInTheDocument();
});

test("WX-09 typing clears the list and brings back Show weather", async () => {
  render(<WeatherSetup initial={{ step: "choosing", draft: "Portland", matches: PORTLANDS }} />);

  await userEvent.type(screen.getByLabelText("City or ZIP code"), ",");

  expect(screen.queryByText("2 places called Portland")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show weather" })).toBeInTheDocument();
});
