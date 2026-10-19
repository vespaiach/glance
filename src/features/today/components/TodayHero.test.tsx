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

const MOM = { id: "mom", name: "Mom", color: "coral", createdAt: iso(8, 0) } as const;

const LEO = { id: "leo", name: "Leo", color: "sky", createdAt: iso(8, 1) } as const;

const lunch = {
  id: "lunch",
  title: "Lunch with Aunt Rosa",
  location: "Café Lumen",
  startAt: iso(12, 0),
  endAt: iso(13, 0),
  everyone: false,
  memberIds: ["mom", "leo"],
};

const ignore = () => {};

const summary = { tz, clock: "12h", members: [MOM, LEO], onOpenEvent: ignore } as const;

test("TODAY-01 the Now panel shows the date, the season icon and the clock, with no season label", () => {
  const { container } = render(
    <TodayHero
      tz={tz}
      season="fall"
      time={new Date(2026, 9, 9, 10, 41)}
      clock="12h"
      weather={<span>weather</span>}
    >
      <span>summary</span>
    </TodayHero>,
  );

  expect(screen.getByText("Friday, October 9")).toBeInTheDocument();
  expect(container.querySelector(".lucide-leaf")).toBeInTheDocument();
  expect(screen.getByText(clockTime("10:41"))).toBeInTheDocument();
  expect(screen.queryByText(/Fall/)).not.toBeInTheDocument();
  expect(screen.queryByText("Glance")).not.toBeInTheDocument();
});

test("TODAY-01 the weather now sits between the clock and the event summary", () => {
  render(
    <TodayHero
      tz={tz}
      season="fall"
      time={new Date(2026, 9, 9, 10, 41)}
      clock="12h"
      weather={<span>weather</span>}
    >
      <span>summary</span>
    </TodayHero>,
  );

  const clock = screen.getByText(clockTime("10:41"));

  const weather = screen.getByText("weather");

  const summary = screen.getByText("summary");

  expect(clock.compareDocumentPosition(weather) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(weather.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("TODAY-02 a running event is happening now, with its place and end", () => {
  render(<HeroSummary {...summary} hero={{ kind: "now", event: call, left: 34 }} />);

  expect(screen.getByText("Happening now")).toBeInTheDocument();
  expect(screen.getByText("Grandma’s video call")).toBeInTheDocument();
  expect(screen.getByText("34 min left")).toBeInTheDocument();
  expect(screen.getByText("Living room · until 11:15 · Everyone")).toBeInTheDocument();
});

test("TODAY-02 a running event with no end says when it started, with AM/PM", () => {
  const garden = { ...call, endAt: undefined, startAt: iso(8, 0), location: "Back yard" };

  render(<HeroSummary {...summary} hero={{ kind: "now", event: garden }} />);

  expect(screen.getByText("Back yard · started 8:00 AM · Everyone")).toBeInTheDocument();
  expect(screen.queryByText(/left$/)).not.toBeInTheDocument();
});

test("TODAY-02 the next event is up next, with its start and AM/PM", () => {
  render(<HeroSummary {...summary} hero={{ kind: "next", event: lunch, in: 80 }} />);

  expect(screen.getByText("Up next")).toBeInTheDocument();
  expect(screen.getByText("In 1 h 20 min")).toBeInTheDocument();
  expect(screen.getByText("Café Lumen · 12:00 PM · Mom, Leo")).toBeInTheDocument();
});

test("TIME-01 the hero times follow the 24-hour setting", () => {
  render(<HeroSummary {...summary} hero={{ kind: "next", event: lunch, in: 80 }} clock="24h" />);

  expect(screen.getByText("Café Lumen · 12:00 · Mom, Leo")).toBeInTheDocument();
});

test("TODAY-02 an event with no place shows only its time", () => {
  const noPlace = { ...lunch, location: undefined };

  render(<HeroSummary {...summary} hero={{ kind: "next", event: noPlace, in: 80 }} />);

  expect(screen.getByText("12:00 PM · Mom, Leo")).toBeInTheDocument();
});

test("TODAY-02 once today's events ended the hero says so", () => {
  render(<HeroSummary {...summary} hero={{ kind: "ended" }} />);

  expect(screen.getByText("Nothing else today")).toBeInTheDocument();
  expect(screen.getByText("Today’s events have ended.")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("TODAY-02 a day with no events has nothing scheduled", () => {
  render(<HeroSummary {...summary} hero={{ kind: "none" }} />);

  expect(screen.getByText("Nothing scheduled")).toBeInTheDocument();
  expect(screen.getByText("Events show here while they happen.")).toBeInTheDocument();
});

test("TODAY-03 tapping the hero event opens it", async () => {
  const onOpenEvent = vi.fn<(id: string) => void>();

  render(
    <HeroSummary
      {...summary}
      hero={{ kind: "now", event: call, left: 34 }}
      onOpenEvent={onOpenEvent}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: /Grandma’s video call/ }));

  expect(onOpenEvent).toHaveBeenCalledWith("call");
});
