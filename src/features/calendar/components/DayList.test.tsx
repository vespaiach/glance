import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, useState } from "react";
import type { CalendarEvent } from "@/domain/schemas";
import { deviceTimeZone } from "@/domain/zone";
import { DayList } from "./DayList";

const tz = deviceTimeZone();

const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m).toISOString();

const plan = (id: string, title: string, day: number, from: number, to: number): CalendarEvent => ({
  id,
  title,
  startAt: at(day, from),
  endAt: at(day, to),
  everyone: true,
  tagIds: [],
  notify: true,
});

const DROP_OFF = plan("drop-off", "School drop-off", 9, 8, 9);

const CALL = plan("call", "Grandma’s video call", 9, 10, 11);

const LUNCH = plan("lunch", "Lunch with Aunt Rosa", 9, 12, 13);

const SOCCER = plan("soccer", "Soccer", 10, 9, 10);

const GRANDPA: CalendarEvent = {
  id: "grandpa",
  title: "Grandpa staying over",
  startAt: "2026-10-09T00:00:00.000Z",
  allDay: true,
  location: "Guest room",
  everyone: true,
  tagIds: [],
  notify: true,
};

const NOW = new Date(2026, 9, 9, 10, 41);

type Props = ComponentProps<typeof DayList>;

function List(props: Partial<Props>) {
  const [open, setOpen] = useState(false);

  return (
    <DayList
      events={[DROP_OFF, CALL, LUNCH]}
      tags={[]}
      day="2026-10-09"
      now={NOW}
      tz={tz}
      clock="12h"
      free="everyone"
      earlierOpen={open}
      onToggleEarlier={() => setOpen((shown) => !shown)}
      onOpenEvent={() => {}}
      onAddEvent={() => {}}
      {...props}
    />
  );
}

const planButton = (title: string) =>
  screen.queryByRole("button", { name: new RegExp(`^${title}, `) });

test("CAL-10 Show {n} earlier shows the ended plans in place and Hide earlier folds them", async () => {
  render(<List />);

  const show = screen.getByRole("button", { name: "Show 1 earlier" });
  expect(show).toHaveAttribute("aria-expanded", "false");
  expect(planButton("School drop-off")).not.toBeInTheDocument();

  await userEvent.click(show);

  const hide = screen.getByRole("button", { name: "Hide earlier" });
  expect(hide).toHaveAttribute("aria-expanded", "true");
  expect(planButton("School drop-off")).toBeInTheDocument();

  await userEvent.click(hide);

  expect(planButton("School drop-off")).not.toBeInTheDocument();
});

test("CAL-10 today groups plans under Happening now and Later today · {n}", () => {
  render(<List />);

  expect(screen.getByText("Happening now")).toBeInTheDocument();
  expect(screen.getByText("Later today · 1")).toBeInTheDocument();
  expect(planButton("Grandma’s video call")).toBeInTheDocument();
  expect(planButton("Lunch with Aunt Rosa")).toBeInTheDocument();
});

test("CAL-10 no Show earlier pill when nothing has ended", () => {
  render(<List events={[CALL, LUNCH]} />);

  expect(screen.queryByRole("button", { name: /earlier/ })).not.toBeInTheDocument();
});

test("CAL-10 another day is one {n} events group", () => {
  render(<List day="2026-10-10" events={[SOCCER]} />);

  expect(screen.getByText("1 event")).toBeInTheDocument();
  expect(screen.queryByText("Happening now")).not.toBeInTheDocument();
  expect(planButton("Soccer")).toBeInTheDocument();
});

test("CAL-10 a plan opens Event details", async () => {
  const onOpenEvent = vi.fn();
  render(<List onOpenEvent={onOpenEvent} />);

  await userEvent.click(planButton("Lunch with Aunt Rosa") as HTMLElement);

  expect(onOpenEvent).toHaveBeenCalledWith(expect.objectContaining({ id: "lunch" }));
});

test("CAL-10 all-day tiles sit above the groups and open Event details", async () => {
  const onOpenEvent = vi.fn();
  render(<List events={[GRANDPA, LUNCH]} onOpenEvent={onOpenEvent} />);

  await userEvent.click(screen.getByRole("button", { name: /Grandpa staying over/ }));

  expect(onOpenEvent).toHaveBeenCalledWith(expect.objectContaining({ id: "grandpa" }));
});

test("CAL-10 an empty day says Nothing scheduled. and its free tile adds an event there", async () => {
  const onAddEvent = vi.fn();
  render(<List day="2026-10-10" events={[]} onAddEvent={onAddEvent} />);

  expect(screen.getByText("Nothing scheduled.")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /^Free .*\. Add event$/ }));

  expect(onAddEvent).toHaveBeenCalledWith({
    start: new Date(2026, 9, 10, 5, 0),
    end: new Date(2026, 9, 10, 6, 0),
  });
});

test("CAL-10 with nobody selected it says No one selected, so no plans show. with no free tile", () => {
  render(<List day="2026-10-10" events={[]} free="none" />);

  expect(screen.getByText("No one selected, so no plans show.")).toBeInTheDocument();
  expect(screen.queryByText("Nothing scheduled.")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Free / })).not.toBeInTheDocument();
});
