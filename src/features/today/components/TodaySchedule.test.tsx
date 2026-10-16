import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CalendarEvent } from "@/domain/schemas";
import { deviceTimeZone } from "@/domain/zone";
import type { ZoneState } from "@/domain/zoneState";
import { TodaySchedule } from "./TodaySchedule";

const tz = deviceTimeZone();

const iso = (h: number, m: number) => new Date(2026, 9, 9, h, m).toISOString();

const EVENTS: CalendarEvent[] = [
  { id: "drop-off", title: "School drop-off", startAt: iso(9, 0), endAt: iso(9, 30), tone: "soft" },
  { id: "call", title: "Grandma’s video call", startAt: iso(10, 30), endAt: iso(11, 15), tone: 1 },
  { id: "lunch", title: "Lunch with Aunt Rosa", startAt: iso(12, 0), endAt: iso(13, 0), tone: 2 },
];

const NOW = new Date(2026, 9, 9, 10, 41);

type Handlers = {
  onOpenEvent: (id: string) => void;
  onAddEvent: () => void;
  onOpenCalendar: () => void;
};

function renderSchedule(state: ZoneState<CalendarEvent>, handlers: Partial<Handlers> = {}) {
  return render(
    <TodaySchedule
      tz={tz}
      retryIn={1}
      onRetry={() => {}}
      state={state}
      now={NOW}
      clock="12h"
      compact={false}
      onOpenEvent={handlers.onOpenEvent ?? (() => {})}
      onAddEvent={handlers.onAddEvent ?? (() => {})}
      onOpenCalendar={handlers.onOpenCalendar ?? (() => {})}
    >
      picture slot
    </TodaySchedule>,
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

test("TODAY-05 rows show past, now and upcoming from the current time", () => {
  renderSchedule(ready);

  const past = screen.getByRole("button", { name: /School drop-off/ });
  const running = screen.getByRole("button", { name: /Grandma’s video call/ });
  const later = screen.getByRole("button", { name: /Lunch with Aunt Rosa/ });

  expect(within(past).getByText("School drop-off").tagName).toBe("S");
  expect(within(running).getByText("Now")).toBeInTheDocument();
  expect(within(later).queryByText("Now")).not.toBeInTheDocument();
  expect(within(later).getByText("Lunch with Aunt Rosa").tagName).toBe("SPAN");
});

test("TIME-01 rows show times without AM/PM", () => {
  renderSchedule(ready);

  expect(screen.getByText("12:00")).toBeInTheDocument();
  expect(screen.getByText("– 1:00")).toBeInTheDocument();
});

test("TODAY-03 tapping a row opens that event", async () => {
  const onOpenEvent = vi.fn<(id: string) => void>();

  renderSchedule(ready, { onOpenEvent });

  await userEvent.click(screen.getByRole("button", { name: /Lunch with Aunt Rosa/ }));

  expect(onOpenEvent).toHaveBeenCalledWith("lunch");
});

test("TODAY-06 an empty day shows the empty tile with its own Add event", async () => {
  const onAddEvent = vi.fn<() => void>();

  renderSchedule({ kind: "empty" }, { onAddEvent });

  expect(screen.getByText("Today · No events")).toBeInTheDocument();
  expect(screen.getByText("No events yet")).toBeInTheDocument();
  expect(
    screen.getByText("Add the first one. It shows here and on the calendar."),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  expect(onAddEvent).toHaveBeenCalledTimes(1);
});

test("TODAY-07 the picture of the day sits under the schedule", () => {
  renderSchedule(ready);

  expect(screen.getByText("picture slot")).toBeInTheDocument();
});

test("LOAD-02 a schedule still loading shows a skeleton", () => {
  renderSchedule({ kind: "loading" });

  expect(screen.getByRole("status", { name: "Loading events" })).toBeInTheDocument();
});

const GRANDPA: CalendarEvent = {
  id: "grandpa",
  title: "Grandpa staying over",
  startAt: "2026-10-09T00:00:00.000Z",
  allDay: true,
  location: "Guest room",
  tone: 2,
};

const withAllDay = { kind: "ready", data: [GRANDPA, ...EVENTS] } as const;

test("TODAY-12 an all-day event shows as a tile above the timed rows", () => {
  renderSchedule(withAllDay);

  const buttons = screen.getAllByRole("button").map((button) => button.textContent);

  const tile = buttons.indexOf("All dayGrandpa staying overGuest room");

  expect(tile).toBeGreaterThan(-1);
  expect(buttons[tile + 1]).toMatch(/School drop-off/);
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
