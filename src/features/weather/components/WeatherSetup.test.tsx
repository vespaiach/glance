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

function renderSetup(state: WeatherSetupState) {
  const callbacks = { onType: vi.fn(), onSubmit: vi.fn(), onPick: vi.fn() };

  render(<WeatherSetup state={state} {...callbacks} />);

  return callbacks;
}

test("WX-04 asks where the screen is, with the city field and Show weather", () => {
  renderSetup(EMPTY);

  expect(screen.getByText("Weather · setup")).toBeInTheDocument();
  expect(screen.getByText("Where is this screen?")).toBeInTheDocument();
  expect(
    screen.getByText("The forecast on Today, Weather and the ambient screen uses this location."),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("City or ZIP code")).toHaveAttribute("placeholder", "Portland, OR");
  expect(screen.getByRole("button", { name: "Show weather" })).toBeInTheDocument();
});

test("WX-04 typing and Show weather call back with the draft and the submit", async () => {
  const { onType, onSubmit } = renderSetup(EMPTY);

  await userEvent.type(screen.getByLabelText("City or ZIP code"), "P");
  await userEvent.click(screen.getByRole("button", { name: "Show weather" }));

  expect(onType).toHaveBeenCalledWith("P");
  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test("WX-04 an empty field shows the error on the input", () => {
  renderSetup({ step: "editing", draft: "", error: "empty" });

  expect(screen.getByLabelText("City or ZIP code")).toHaveAccessibleDescription(
    "Enter a city or ZIP code",
  );
});

test("WX-07 searching replaces the button with the search status", () => {
  renderSetup({ step: "searching", draft: "Portland", query: "Portland" });

  expect(screen.getByRole("status")).toHaveTextContent("Looking for Portland…");
  expect(screen.queryByRole("button", { name: "Show weather" })).not.toBeInTheDocument();
});

test("WX-07 typing during the search calls back with the new draft", async () => {
  const { onType } = renderSetup({ step: "searching", draft: "Portland", query: "Portland" });

  await userEvent.type(screen.getByLabelText("City or ZIP code"), "s");

  expect(onType).toHaveBeenCalledWith("Portlands");
});

test("WX-07 a failed search shows the search-unavailable error on the input", () => {
  renderSetup({ step: "editing", draft: "Portland", error: "unavailable" });

  expect(screen.getByLabelText("City or ZIP code")).toHaveAccessibleDescription(
    "Place search isn’t responding. Try again in a moment.",
  );
});

test("WX-08 an unknown place shows the error on the input", () => {
  renderSetup({ step: "editing", draft: "Pordland", error: "unknown" });

  expect(screen.getByLabelText("City or ZIP code")).toHaveAccessibleDescription(
    "We couldn’t find that place. Try a city and state, like Austin, TX",
  );
});

test("WX-09 several matches list one row per place under a count", () => {
  renderSetup({ step: "choosing", draft: "Portland", matches: PORTLANDS });

  expect(screen.getByText("2 places called Portland")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /^Portland\s*Oregon, United States$/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /^Portland\s*Maine, United States$/ }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Show weather" })).not.toBeInTheDocument();
});

test("WX-09 tapping a row picks that place", async () => {
  const { onPick } = renderSetup({ step: "choosing", draft: "Portland", matches: PORTLANDS });

  await userEvent.click(screen.getByRole("button", { name: /^Portland\s*Maine, United States$/ }));

  expect(onPick).toHaveBeenCalledWith(PORTLANDS[1]);
});

test("KB-04 Return in the city field submits it", async () => {
  const { onSubmit } = renderSetup({ step: "editing", draft: "Portland" });

  await userEvent.type(screen.getByLabelText("City or ZIP code"), "{Enter}");

  expect(onSubmit).toHaveBeenCalledTimes(1);
});
