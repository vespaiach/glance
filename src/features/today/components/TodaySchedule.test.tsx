import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import type { CalendarEvent, Tag } from "@/domain/schemas";
import { deviceTimeZone } from "@/domain/zone";
import type { ZoneState } from "@/domain/zoneState";
import type { TimelineWeather } from "@/ui/DayTimeline";
import { TodaySchedule } from "./TodaySchedule";

const tz = deviceTimeZone();

const iso = (h: number, m: number) => new Date(2026, 9, 9, h, m).toISOString();

const EVENTS: CalendarEvent[] = [
  {
    id: "drop-off",
    title: "School drop-off",
    startAt: iso(9, 0),
    endAt: iso(9, 30),
    everyone: true,
    tagIds: [],
  },
  {
    id: "call",
    title: "Grandma’s video call",
    startAt: iso(10, 30),
    endAt: iso(11, 15),
    everyone: true,
    tagIds: [],
  },
  {
    id: "lunch",
    title: "Lunch with Aunt Rosa",
    startAt: iso(12, 0),
    endAt: iso(13, 0),
    everyone: true,
    tagIds: [],
  },
];

const NOW = new Date(2026, 9, 9, 10, 41);

const GRANDPA: CalendarEvent = {
  id: "grandpa",
  title: "Grandpa staying over",
  startAt: "2026-10-09T00:00:00.000Z",
  allDay: true,
  location: "Guest room",
  everyone: true,
  tagIds: [],
};

const WEATHER: TimelineWeather = {
  hourly: [12, 13].map((hour) => ({
    time: iso(hour, 0),
    icon: "cloud" as const,
    temp: 66 + hour - 12,
    precip: 10,
  })),
  unit: "F",
};

const tag = (n: number, name: string, color: Tag["color"]): Tag => ({
  id: `0195f0a0-0000-7000-8000-00000000050${n}`,
  name,
  color,
  createdAt: "2026-10-01T15:00:00.000Z",
});

const MOM = tag(1, "Mom", "coral");

const DAD = tag(2, "Dad", "sky");

const TIN = tag(3, "Tin", "mint");

const UPCOMING: CalendarEvent[] = [
  {
    id: "fair",
    title: "Fair day",
    startAt: "2026-10-10T00:00:00.000Z",
    allDay: true,
    location: "Park",
    everyone: true,
    tagIds: [],
  },
  {
    id: "soccer",
    title: "Soccer",
    startAt: new Date(2026, 9, 10, 9, 0).toISOString(),
    endAt: new Date(2026, 9, 10, 10, 0).toISOString(),
    everyone: false,
    tagIds: [MOM.id, DAD.id],
  },
  {
    id: "dentist",
    title: "Dentist",
    startAt: new Date(2026, 9, 11, 15, 0).toISOString(),
    everyone: false,
    tagIds: [MOM.id],
  },
];

type Props = ComponentProps<typeof TodaySchedule>;

function renderSchedule(state: ZoneState<CalendarEvent>, props: Partial<Props> = {}) {
  return render(<TodaySchedule {...rendered(state)} {...props} />);
}

function cardWidth(width: number) {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(800);
}

afterEach(() => {
  vi.restoreAllMocks();
});

function rendered(state: ZoneState<CalendarEvent>): Props {
  return {
    tz,
    retryIn: 1,
    onRetry: () => {},
    state,
    tags: [],
    day: "2026-10-09",
    now: NOW,
    clock: "12h",
    breakpoint: "large",
    iconActions: false,
    upcoming: [],
    onOpenEvent: () => {},
    onAddEvent: () => {},
    onAddSlot: () => {},
    onOpenCalendar: () => {},
  };
}

const ready = { kind: "ready", data: EVENTS } as const;

test("TODAY-04 the eyebrow counts what is still ahead", () => {
  renderSchedule(ready);

  expect(screen.getByText("Today · 2 of 3 left")).toBeInTheDocument();
});

test("TODAY-04 once everything has ended the eyebrow says All done", () => {
  renderSchedule({ kind: "ready", data: EVENTS.slice(0, 1) });

  expect(screen.getByText("Today · All done")).toBeInTheDocument();
});

test("TODAY-04 on a card narrower than 450 px the eyebrow takes its short form", () => {
  cardWidth(449);

  const { rerender } = renderSchedule(ready);

  expect(screen.getByText("2 left today")).toBeInTheDocument();

  rerender(
    <TodaySchedule {...rendered(ready)} state={{ kind: "ready", data: EVENTS.slice(0, 1) }} />,
  );

  expect(screen.getByText("All done")).toBeInTheDocument();
});

test("TODAY-04 on a narrow card a day with no plans says No events", () => {
  cardWidth(449);

  renderSchedule({ kind: "empty" });

  expect(screen.getByText("No events")).toBeInTheDocument();
});

test("TODAY-04 on a card narrower than 450 px the header buttons are icon-only even from 1440 px", () => {
  cardWidth(449);

  renderSchedule(ready);

  expect(screen.getByRole("button", { name: "Add event" })).toHaveTextContent("");
  expect(screen.getByRole("button", { name: "Full calendar" })).toHaveTextContent("");
});

test("TODAY-11 on a card narrower than 400 px the now pill is a dot named by the time", () => {
  cardWidth(399);

  renderSchedule(ready);

  expect(screen.getByRole("img", { name: "10:41" })).toBeInTheDocument();
  expect(screen.queryByText("10:41")).not.toBeInTheDocument();
});

test("TODAY-11 from 400 px the now pill shows the time", () => {
  cardWidth(400);

  renderSchedule(ready);

  expect(screen.getByText("10:41")).toBeInTheDocument();
});

test("TODAY-04 Add event opens a new event on today", async () => {
  const onAddEvent = vi.fn<() => void>();

  renderSchedule(ready, { onAddEvent });

  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  expect(onAddEvent).toHaveBeenCalledTimes(1);
});

test("TODAY-04 Full calendar opens the calendar", async () => {
  const onOpenCalendar = vi.fn<() => void>();

  renderSchedule(ready, { onOpenCalendar });

  await userEvent.click(screen.getByRole("button", { name: "Full calendar" }));

  expect(onOpenCalendar).toHaveBeenCalledTimes(1);
});

test("TODAY-11 the schedule is the day timeline with a card per plan still ahead", () => {
  renderSchedule(ready);

  expect(screen.queryByRole("button", { name: /^School drop-off, / })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Grandma’s video call, / })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Lunch with Aunt Rosa, / })).toBeInTheDocument();
});

test("TODAY-11 Earlier shows the ended plans and Hide earlier folds them again", async () => {
  renderSchedule(ready);

  const earlier = screen.getByRole("button", { name: "Earlier · 1 done" });

  expect(earlier).toHaveAttribute("aria-expanded", "false");

  await userEvent.click(earlier);

  expect(screen.getByRole("button", { name: /^School drop-off, / })).toBeInTheDocument();

  const hide = screen.getByRole("button", { name: "Hide earlier" });

  expect(hide).toHaveAttribute("aria-expanded", "true");

  await userEvent.click(hide);

  expect(screen.queryByRole("button", { name: /^School drop-off, / })).not.toBeInTheDocument();
});

test("TODAY-11 the Earlier pill is hidden when nothing has ended", () => {
  renderSchedule({ kind: "ready", data: EVENTS.slice(1) });

  expect(screen.queryByRole("button", { name: /Earlier/ })).not.toBeInTheDocument();
});

test("TODAY-03 tapping a plan opens that event", async () => {
  const onOpenEvent = vi.fn<(id: string) => void>();

  renderSchedule(ready, { onOpenEvent });

  await userEvent.click(screen.getByRole("button", { name: /^Lunch with Aunt Rosa, / }));

  expect(onOpenEvent).toHaveBeenCalledWith("lunch");
});

test("TODAY-03 tapping a free slot adds an event at that slot", async () => {
  const onAddSlot = vi.fn<(slot: { start: Date; end: Date }) => void>();

  renderSchedule(ready, { onAddSlot });

  await userEvent.click(screen.getByRole("button", { name: /^Free 1:00/ }));

  expect(onAddSlot).toHaveBeenCalledWith({
    start: new Date(2026, 9, 9, 13, 0),
    end: new Date(2026, 9, 9, 14, 0),
  });
});

test("TODAY-06 a day with no plans lists what's coming up instead of a timeline", () => {
  renderSchedule({ kind: "empty" }, { upcoming: UPCOMING, tags: [MOM, DAD, TIN] });

  expect(screen.getByText("Today · No events")).toBeInTheDocument();
  expect(screen.getByText("Coming up")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Free / })).not.toBeInTheDocument();
  expect(
    screen
      .getAllByRole("button", { name: /, (Tomorrow|Sun, Oct 11)/ })
      .map((row) => row.textContent),
  ).toEqual([
    "TomorrowAll dayFair dayEveryone · Park",
    "Tomorrow9:00 AMSoccerMom, Dad",
    "Sun, Oct 113:00 PMDentistMom",
  ]);
});

test("TODAY-06 tapping a coming-up plan opens it", async () => {
  const onOpenEvent = vi.fn<(id: string) => void>();

  renderSchedule({ kind: "empty" }, { upcoming: UPCOMING, onOpenEvent });

  await userEvent.click(screen.getByRole("button", { name: /^Dentist, / }));

  expect(onOpenEvent).toHaveBeenCalledWith("dentist");
});

test("TODAY-06 with nothing ahead it says so", () => {
  renderSchedule({ kind: "empty" });

  expect(screen.getByText("Nothing else on the calendar yet.")).toBeInTheDocument();
});

test("TODAY-06 an empty day keeps Add event in the header", async () => {
  const onAddEvent = vi.fn<() => void>();

  renderSchedule({ kind: "empty" }, { onAddEvent });

  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  expect(onAddEvent).toHaveBeenCalledTimes(1);
});

test("TL-07 a day with no timed plans shows the hour weather in the gutter, no lane", () => {
  renderSchedule({ kind: "ready", data: [GRANDPA] }, { weather: WEATHER });

  expect(screen.queryByRole("list", { name: "Hourly weather" })).not.toBeInTheDocument();
  expect(screen.getByText("66°")).toBeInTheDocument();
});

test("TODAY-11 a day with timed plans keeps the hour weather in the gutter", () => {
  renderSchedule(ready, { weather: WEATHER });

  expect(screen.queryByRole("list", { name: "Hourly weather" })).not.toBeInTheDocument();
  expect(screen.getByText("66°")).toBeInTheDocument();
});

test("TODAY-04 a schedule still loading has no Add event", () => {
  renderSchedule({ kind: "loading" });

  expect(screen.queryByRole("button", { name: "Add event" })).not.toBeInTheDocument();
});

test("LOAD-02 a schedule still loading shows a skeleton", () => {
  renderSchedule({ kind: "loading" });

  expect(screen.getByRole("status", { name: "Loading events" })).toBeInTheDocument();
});

const withAllDay = { kind: "ready", data: [GRANDPA, ...EVENTS] } as const;

test("TODAY-12 an all-day event shows as a tile above the timeline", () => {
  renderSchedule(withAllDay);

  const buttons = screen.getAllByRole("button").map((button) => button.textContent);

  const tile = buttons.indexOf("All dayGrandpa staying overEveryone · Guest room");

  expect(tile).toBeGreaterThan(-1);
  expect(buttons.slice(0, tile).join()).not.toMatch(/School drop-off/);
});

test("TODAY-04 all-day events count as left in the eyebrow", () => {
  renderSchedule(withAllDay);

  expect(screen.getByText("Today · 3 of 4 left")).toBeInTheDocument();
});

test("TODAY-12 tapping an all-day tile opens that event", async () => {
  const onOpenEvent = vi.fn<(id: string) => void>();

  renderSchedule(withAllDay, { onOpenEvent });

  await userEvent.click(screen.getByRole("button", { name: /Grandpa staying over/ }));

  expect(onOpenEvent).toHaveBeenCalledWith("grandpa");
});

test("TODAY-11 the schedule has no See all row", () => {
  renderSchedule(ready);

  expect(screen.queryByRole("button", { name: /See all/ })).not.toBeInTheDocument();
});

test("TODAY-04 with icon actions, Add event and Full calendar are icon-only and keep their names and callbacks", async () => {
  const onAddEvent = vi.fn<() => void>();

  const onOpenCalendar = vi.fn<() => void>();

  renderSchedule(ready, { onAddEvent, onOpenCalendar, iconActions: true });

  const add = screen.getByRole("button", { name: "Add event" });

  const calendar = screen.getByRole("button", { name: "Full calendar" });

  await userEvent.click(add);

  await userEvent.click(calendar);

  expect([add.textContent, calendar.textContent]).toEqual(["", ""]);

  expect([onAddEvent, onOpenCalendar].map((fn) => fn.mock.calls.length)).toEqual([1, 1]);
});

test("TODAY-04 icon-only, an empty day keeps Add event in the header", () => {
  renderSchedule({ kind: "empty" }, { iconActions: true });

  expect(screen.getByRole("button", { name: "Add event" })).toHaveTextContent("");
});
