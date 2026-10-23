import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CalendarEvent } from "@/domain/schemas";
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

type Handlers = {
  onOpenEvent: (id: string) => void;
  onAddEvent: () => void;
  onAddSlot: (slot: { start: Date; end: Date }) => void;
  onOpenCalendar: () => void;
};

function renderSchedule(
  state: ZoneState<CalendarEvent>,
  handlers: Partial<Handlers> = {},
  iconActions = false,
  weather?: TimelineWeather,
) {
  return render(
    <TodaySchedule
      tz={tz}
      retryIn={1}
      onRetry={() => {}}
      state={state}
      tags={[]}
      day="2026-10-09"
      now={NOW}
      clock="12h"
      breakpoint="large"
      iconActions={iconActions}
      weather={weather}
      onOpenEvent={handlers.onOpenEvent ?? (() => {})}
      onAddEvent={handlers.onAddEvent ?? (() => {})}
      onAddSlot={handlers.onAddSlot ?? (() => {})}
      onOpenCalendar={handlers.onOpenCalendar ?? (() => {})}
    />,
  );
}

const ready = { kind: "ready", data: EVENTS } as const;

test("TODAY-04 the eyebrow counts today's events", () => {
  renderSchedule(ready);

  expect(screen.getByText("Today · 3 events")).toBeInTheDocument();
});

test("TODAY-04 a day with one event says 1 event", () => {
  renderSchedule({ kind: "ready", data: EVENTS.slice(0, 1) });

  expect(screen.getByText("Today · 1 event")).toBeInTheDocument();
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

test("TODAY-11 the schedule is the day timeline with a card per plan", () => {
  renderSchedule(ready);

  expect(screen.getByRole("button", { name: /^School drop-off, / })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Grandma’s video call, / })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Lunch with Aunt Rosa, / })).toBeInTheDocument();
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

test("TODAY-06 an empty day shows the day timeline with one free slot and no empty card", () => {
  renderSchedule({ kind: "empty" });

  expect(screen.getByText("Today · No events")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Free .*Add event$/ })).toHaveTextContent(
    /^Everyone free · /,
  );
  expect(screen.queryByText("No events yet")).not.toBeInTheDocument();
});

test("TODAY-06 an empty day keeps Add event in the header", async () => {
  const onAddEvent = vi.fn<() => void>();

  renderSchedule({ kind: "empty" }, { onAddEvent });

  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  expect(onAddEvent).toHaveBeenCalledTimes(1);
});

test("TL-07 a day with no timed plans shows the hour weather in the gutter, no lane", () => {
  renderSchedule({ kind: "ready", data: [GRANDPA] }, {}, false, WEATHER);

  expect(screen.queryByRole("list", { name: "Hourly weather" })).not.toBeInTheDocument();
  expect(screen.getByText("66°")).toBeInTheDocument();
});

test("TODAY-11 a day with timed plans keeps the hour weather in the gutter", () => {
  renderSchedule(ready, {}, false, WEATHER);

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

test("TODAY-04 all-day events count in the eyebrow", () => {
  renderSchedule(withAllDay);

  expect(screen.getByText("Today · 4 events")).toBeInTheDocument();
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

  renderSchedule(ready, { onAddEvent, onOpenCalendar }, true);

  const add = screen.getByRole("button", { name: "Add event" });

  const calendar = screen.getByRole("button", { name: "Full calendar" });

  await userEvent.click(add);

  await userEvent.click(calendar);

  expect([add.textContent, calendar.textContent]).toEqual(["", ""]);

  expect([onAddEvent, onOpenCalendar].map((fn) => fn.mock.calls.length)).toEqual([1, 1]);
});

test("TODAY-04 icon-only, an empty day keeps Add event in the header", () => {
  renderSchedule({ kind: "empty" }, {}, true);

  expect(screen.getByRole("button", { name: "Add event" })).toHaveTextContent("");
});
