import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CalendarEvent } from "@/domain/schemas";
import type { ZoneState } from "@/domain/zoneState";
import { DayPanel } from "./DayPanel";

const iso = (h: number, m: number) => new Date(2026, 9, 9, h, m).toISOString();

const EVENTS: CalendarEvent[] = [
  { id: "drop-off", title: "School drop-off", startAt: iso(9, 0), endAt: iso(9, 30), tone: "soft" },
  { id: "call", title: "Grandma’s video call", startAt: iso(10, 30), endAt: iso(11, 15), tone: 1 },
  { id: "lunch", title: "Lunch with Aunt Rosa", startAt: iso(12, 0), endAt: iso(13, 0), tone: 2 },
];

const NOW = new Date(2026, 9, 9, 10, 41);

type Options = {
  calendarEmpty?: boolean;
  onOpenEvent?: (id: string) => void;
  onAddEvent?: () => void;
};

function renderPanel(state: ZoneState<CalendarEvent>, options: Options = {}) {
  return render(
    <DayPanel
      state={state}
      title="Friday, Oct 9"
      calendarEmpty={options.calendarEmpty ?? false}
      now={NOW}
      clock="12h"
      compact={false}
      onOpenEvent={options.onOpenEvent ?? (() => {})}
      onAddEvent={options.onAddEvent ?? (() => {})}
    />,
  );
}

const ready = { kind: "ready", data: EVENTS } as const;

test("CAL-01 the heading names the selected day", () => {
  renderPanel(ready);

  expect(screen.getByRole("heading", { name: "Friday, Oct 9" })).toBeInTheDocument();
});

test("CAL-04 the eyebrow counts the day's events", () => {
  renderPanel(ready);

  expect(screen.getByText("3 events")).toBeInTheDocument();
});

test("CAL-04 a day with one event says 1 event", () => {
  renderPanel({ kind: "ready", data: EVENTS.slice(0, 1) });

  expect(screen.getByText("1 event")).toBeInTheDocument();
});

test("CAL-04 a day with events lists them with the edit caption", () => {
  renderPanel(ready);

  expect(screen.getAllByRole("button", { name: /School drop-off|video call|Lunch/ })).toHaveLength(
    3,
  );
  expect(screen.getByText("Select an event to edit or delete it")).toBeInTheDocument();
});

test("CAL-04 an empty day says No events and a free day, without the caption", () => {
  renderPanel({ kind: "empty" });

  expect(screen.getByText("No events")).toBeInTheDocument();
  expect(screen.getByText("Nothing scheduled. A free day.")).toBeInTheDocument();
  expect(screen.queryByText("Select an event to edit or delete it")).not.toBeInTheDocument();
});

test("CAL-04 with no events at all the day shows the empty calendar tile", () => {
  renderPanel({ kind: "empty" }, { calendarEmpty: true });

  expect(screen.getByText("The calendar is empty")).toBeInTheDocument();
  expect(
    screen.getByText("Select a day, then add an event. Days with events get a dot."),
  ).toBeInTheDocument();
  expect(screen.queryByText("Nothing scheduled. A free day.")).not.toBeInTheDocument();
});

test("CAL-05 Add event reports a new event on the selected day", async () => {
  const onAddEvent = vi.fn();
  renderPanel({ kind: "empty" }, { onAddEvent });

  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  expect(onAddEvent).toHaveBeenCalledTimes(1);
});

test("CAL-05 tapping a row opens that event", async () => {
  const onOpenEvent = vi.fn();
  renderPanel(ready, { onOpenEvent });

  await userEvent.click(screen.getByRole("button", { name: /Lunch with Aunt Rosa/ }));

  expect(onOpenEvent).toHaveBeenCalledWith("lunch");
});

test("LOAD-02 loading shows the day skeleton", () => {
  renderPanel({ kind: "loading" });

  expect(screen.getByLabelText("Loading events")).toBeInTheDocument();
  expect(screen.getByText("Loading")).toBeInTheDocument();
});

test("FAIL-01 a failed calendar says it is unavailable", () => {
  renderPanel({ kind: "failed" });

  expect(screen.getByText("Calendar unavailable")).toBeInTheDocument();
});
