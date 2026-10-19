import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { deviceTimeZone } from "@/domain/zone";
import { clockTime } from "@/ui/testClock";
import { HeroSummary } from "./HeroSummary";
import { TodayHero } from "./TodayHero";

const tz = deviceTimeZone();

const iso = (h: number, m: number) => new Date(2026, 9, 9, h, m).toISOString();

const call = {
  id: "call",
  title: "Grandma’s video call",
  location: "Living room",
  startAt: iso(10, 30),
  endAt: iso(11, 15),
  everyone: true,
  memberIds: [],
};

const lunch = {
  id: "lunch",
  title: "Lunch with Aunt Rosa",
  location: "Café Lumen",
  startAt: iso(12, 0),
  endAt: iso(13, 0),
  everyone: true,
  memberIds: [],
};

const ignore = () => {};

test("TODAY-01 the hero shows the season and month and the clock, with no screen label", () => {
  render(
    <TodayHero tz={tz} season="fall" time={new Date(2026, 9, 9, 10, 41)} clock="12h">
      summary
    </TodayHero>,
  );

  expect(screen.getByText("Fall · October")).toBeInTheDocument();
  expect(screen.getByText("Friday, October 9")).toBeInTheDocument();
  expect(screen.getByText(clockTime("10:41"))).toBeInTheDocument();
  expect(screen.queryByText("Glance")).not.toBeInTheDocument();
  expect(screen.getByText("summary")).toBeInTheDocument();
});

test("TODAY-01 the picture of the day sits at the bottom of the hero, after the summary", () => {
  render(
    <TodayHero
      tz={tz}
      season="fall"
      time={new Date(2026, 9, 9, 10, 41)}
      clock="12h"
      picture={<span>picture</span>}
    >
      <span>summary</span>
    </TodayHero>,
  );

  const summary = screen.getByText("summary");

  const picture = screen.getByText("picture");

  expect(summary.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("TODAY-02 a running event is happening now, with its place and end", () => {
  render(
    <HeroSummary tz={tz} hero={{ kind: "now", event: call }} clock="12h" onOpenEvent={ignore} />,
  );

  expect(screen.getByText("Happening now")).toBeInTheDocument();
  expect(screen.getByText("Grandma’s video call")).toBeInTheDocument();
  expect(screen.getByText("Living room · until 11:15")).toBeInTheDocument();
});

test("TODAY-02 a running event with no end says when it started, with AM/PM", () => {
  const garden = { ...call, endAt: undefined, startAt: iso(8, 0), location: "Back yard" };

  render(
    <HeroSummary tz={tz} hero={{ kind: "now", event: garden }} clock="12h" onOpenEvent={ignore} />,
  );

  expect(screen.getByText("Back yard · started 8:00 AM")).toBeInTheDocument();
});

test("TODAY-02 the next event is up next, with its start and AM/PM", () => {
  render(
    <HeroSummary tz={tz} hero={{ kind: "next", event: lunch }} clock="12h" onOpenEvent={ignore} />,
  );

  expect(screen.getByText("Up next")).toBeInTheDocument();
  expect(screen.getByText("Café Lumen · 12:00 PM")).toBeInTheDocument();
});

test("TIME-01 the hero times follow the 24-hour setting", () => {
  render(
    <HeroSummary tz={tz} hero={{ kind: "next", event: lunch }} clock="24h" onOpenEvent={ignore} />,
  );

  expect(screen.getByText("Café Lumen · 12:00")).toBeInTheDocument();
});

test("TODAY-02 an event with no place shows only its time", () => {
  const noPlace = { ...lunch, location: undefined };

  render(
    <HeroSummary
      tz={tz}
      hero={{ kind: "next", event: noPlace }}
      clock="12h"
      onOpenEvent={ignore}
    />,
  );

  expect(screen.getByText("12:00 PM")).toBeInTheDocument();
});

test("TODAY-02 once today's events ended the hero says so", () => {
  render(<HeroSummary tz={tz} hero={{ kind: "ended" }} clock="12h" onOpenEvent={ignore} />);

  expect(screen.getByText("Nothing else today")).toBeInTheDocument();
  expect(screen.getByText("Today’s events have ended.")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("TODAY-02 a day with no events has nothing scheduled", () => {
  render(<HeroSummary tz={tz} hero={{ kind: "none" }} clock="12h" onOpenEvent={ignore} />);

  expect(screen.getByText("Nothing scheduled")).toBeInTheDocument();
  expect(screen.getByText("Events show here while they happen.")).toBeInTheDocument();
});

test("TODAY-03 tapping the hero event opens it", async () => {
  const onOpenEvent = vi.fn<(id: string) => void>();

  render(
    <HeroSummary
      tz={tz}
      hero={{ kind: "now", event: call }}
      clock="12h"
      onOpenEvent={onOpenEvent}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: /Grandma’s video call/ }));

  expect(onOpenEvent).toHaveBeenCalledWith("call");
});
