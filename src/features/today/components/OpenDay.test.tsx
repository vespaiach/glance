import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { dayRibbon } from "@/domain/dayRibbon";
import { deviceTimeZone } from "@/domain/zone";
import { OpenDay } from "./OpenDay";

const tz = deviceTimeZone();

const at = (h: number, m = 0) => new Date(2026, 9, 9, h, m);

const call = { startAt: at(10, 30).toISOString(), endAt: at(11, 15).toISOString() };

const sunset = at(18, 42);

const ignore = () => {};

function openDay(
  hero: { kind: "none" } | { kind: "ended"; done: number },
  now: Date,
  overrides: Partial<React.ComponentProps<typeof OpenDay>> = {},
) {
  return render(
    <OpenDay
      hero={hero}
      ribbon={dayRibbon(hero.kind === "ended" ? [call] : [], now, sunset, tz)}
      now={now}
      clock="12h"
      tz={tz}
      nextLine="Tomorrow · 9:00 AM · Soccer game, Laurelhurst Park"
      onOpenCalendar={ignore}
      {...overrides}
    />,
  );
}

test("TODAY-13 a day with no events is wide open, free until 10 PM with the time left", () => {
  openDay({ kind: "none" }, at(10, 41));

  expect(screen.getByText("Today · Open")).toBeInTheDocument();
  expect(screen.getByText("The day is wide open")).toBeInTheDocument();
  expect(screen.getByText("Free until 10 PM · 11 h 19 min")).toBeInTheDocument();
});

test("TODAY-02 once the events ended the day is a wrap, with the count done", () => {
  openDay({ kind: "ended", done: 2 }, at(13, 0));

  expect(screen.getByText("That’s a wrap for today")).toBeInTheDocument();
  expect(screen.getByText("2 events done · free until 10 PM")).toBeInTheDocument();
});

test("TODAY-02 one event done reads in the singular", () => {
  openDay({ kind: "ended", done: 1 }, at(13, 0));

  expect(screen.getByText("1 event done · free until 10 PM")).toBeInTheDocument();
});

test("TODAY-13 at 10 PM the line has no time left", () => {
  openDay({ kind: "none" }, at(22, 0));

  expect(screen.getByText("Free until 10 PM")).toBeInTheDocument();
});

test("TIME-01 the open day follows the 24-hour setting", () => {
  openDay({ kind: "none" }, at(10, 41), { clock: "24h" });

  expect(screen.getByText("Free until 22:00 · 11 h 19 min")).toBeInTheDocument();
  expect(screen.getByText("Now 10:41")).toBeInTheDocument();
  expect(screen.getByText("06:00")).toBeInTheDocument();
  expect(screen.getByText("22:00")).toBeInTheDocument();
});

test("TODAY-13 the ribbon labels the ends and the time now", () => {
  openDay({ kind: "none" }, at(10, 41));

  expect(screen.getByText("Now 10:41 AM")).toBeInTheDocument();
  expect(screen.getByText("6 AM")).toBeInTheDocument();
  expect(screen.getByText("10 PM")).toBeInTheDocument();
});

test("TODAY-13 the sunset icon shows only when the forecast knows the sunset", () => {
  const { container, rerender } = openDay({ kind: "none" }, at(10, 41));

  expect(container.querySelector(".lucide-sunset")).toBeInTheDocument();

  rerender(
    <OpenDay
      hero={{ kind: "none" }}
      ribbon={dayRibbon([], at(10, 41), undefined, tz)}
      now={at(10, 41)}
      clock="12h"
      tz={tz}
      onOpenCalendar={ignore}
    />,
  );

  expect(container.querySelector(".lucide-sunset")).not.toBeInTheDocument();
});

test("TODAY-13 the Next on the calendar tile shows the next event and opens the calendar", async () => {
  const onOpenCalendar = vi.fn<() => void>();

  openDay({ kind: "none" }, at(10, 41), { onOpenCalendar });

  const tile = screen.getByRole("button", { name: /Next on the calendar/ });

  expect(tile).toHaveTextContent("Tomorrow · 9:00 AM · Soccer game, Laurelhurst Park");

  await userEvent.click(tile);

  expect(onOpenCalendar).toHaveBeenCalledTimes(1);
});

test("TODAY-13 with no upcoming event there is no tile", () => {
  openDay({ kind: "none" }, at(10, 41), { nextLine: undefined });

  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByText("Next on the calendar")).not.toBeInTheDocument();
});
