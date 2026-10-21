import { render, screen, within } from "@testing-library/react";
import { copy } from "@/copy";
import { DayPreview, type PreviewHour, type PreviewTile } from "./DayPreview";

const words = copy.events.preview;

const HOURS: PreviewHour[] = [
  { time: "9 AM", icon: "sun", temp: "55°", label: "9 AM, Clear, 55 degrees" },
  { time: "10 AM", icon: "cloud", temp: "57°", label: "10 AM, Cloudy, 57 degrees" },
];

const TILE: PreviewTile = { icon: "sun", temp: "55°", condition: "Clear", hours: [] };

const PLANS = [
  { id: "a", time: "All day", title: "School holiday", who: "Everyone" },
  { id: "b", time: "8:15 AM – 3:00 PM", title: "Field trip", who: "Mia" },
];

function renderPreview(weather: PreviewTile | "none" | undefined, plans = PLANS) {
  render(<DayPreview label="Fri, Oct 9 · 9 AM – 10 AM" weather={weather} plans={plans} />);
}

describe("DayPreview", () => {
  it("EVT-13 is a labelled complementary column", () => {
    renderPreview(TILE);

    expect(screen.getByRole("complementary", { name: "Fri, Oct 9 · 9 AM – 10 AM" })).toBeVisible();
  });

  it("EVT-13 shows the temperature and condition in the weather tile", () => {
    renderPreview({ ...TILE, condition: "Drizzle · 40% rain" });

    expect(screen.getByText("55°")).toBeVisible();
    expect(screen.getByText("Drizzle · 40% rain")).toBeVisible();
    expect(screen.queryByRole("list", { name: words.hourly })).not.toBeInTheDocument();
  });

  it("EVT-13 shows the hourly strip when the event covers several hours", () => {
    renderPreview({ ...TILE, hours: HOURS });

    const strip = screen.getByRole("list", { name: words.hourly });

    expect(within(strip).getAllByRole("listitem")).toHaveLength(2);
    expect(within(strip).getByLabelText("10 AM, Cloudy, 57 degrees")).toBeVisible();
  });

  it("EVT-13 says there is no forecast for the date", () => {
    renderPreview("none");

    expect(screen.getByText(words.noForecast)).toBeVisible();
    expect(screen.queryByText("55°")).not.toBeInTheDocument();
  });

  it("EVT-13 shows no weather at all without a location", () => {
    renderPreview(undefined);

    expect(screen.queryByText(words.noForecast)).not.toBeInTheDocument();
    expect(screen.getByText("Also at this time · 2")).toBeVisible();
  });

  it("EVT-13 lists the overlapping plans with their time line, title and who", () => {
    renderPreview(TILE);

    const list = screen.getByRole("list", { name: "Also at this time · 2" });

    const [holiday, trip] = within(list).getAllByRole("listitem");

    expect(holiday).toHaveTextContent("All day");
    expect(holiday).toHaveTextContent("School holiday · Everyone");
    expect(trip).toHaveTextContent("8:15 AM – 3:00 PM");
    expect(trip).toHaveTextContent("Field trip · Mia");
  });

  it("EVT-13 says nothing else is at this time", () => {
    renderPreview(TILE, []);

    expect(screen.getByText("Also at this time")).toBeVisible();
    expect(screen.getByText(words.nothing)).toBeVisible();
  });
});
