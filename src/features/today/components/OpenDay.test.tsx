import { render, screen } from "@testing-library/react";
import { dayRibbon } from "@/domain/dayRibbon";
import { deviceTimeZone } from "@/domain/zone";
import { OpenDay } from "./OpenDay";

const tz = deviceTimeZone();

const at = (h: number, m = 0) => new Date(2026, 9, 9, h, m);

const call = { startAt: at(10, 30).toISOString(), endAt: at(11, 15).toISOString() };

const sunset = at(18, 42);

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
      {...overrides}
    />,
  );
}

test("TODAY-13 a day with no events is wide open, free until 9 PM with the time left", () => {
  openDay({ kind: "none" }, at(10, 41));

  expect(screen.getByText("Today · Open")).toBeInTheDocument();
  expect(screen.getByText("The day is wide open")).toBeInTheDocument();
  expect(screen.getByText("Free until 9 PM · 10 h 19 min")).toBeInTheDocument();
});

test("TODAY-02 once the events ended the day is a wrap, with the count done", () => {
  openDay({ kind: "ended", done: 2 }, at(13, 0));

  expect(screen.getByText("That’s a wrap for today")).toBeInTheDocument();
  expect(screen.getByText("2 events done · free until 9 PM")).toBeInTheDocument();
});

test("TODAY-02 one event done reads in the singular", () => {
  openDay({ kind: "ended", done: 1 }, at(13, 0));

  expect(screen.getByText("1 event done · free until 9 PM")).toBeInTheDocument();
});

test("TODAY-13 at 9 PM and after the line has no time left", () => {
  openDay({ kind: "none" }, at(21, 30));

  expect(screen.getByText("Free until 9 PM")).toBeInTheDocument();
});

test("TIME-01 the open day follows the 24-hour setting", () => {
  openDay({ kind: "none" }, at(10, 41), { clock: "24h" });

  expect(screen.getByText("Free until 21:00 · 10 h 19 min")).toBeInTheDocument();
  expect(screen.getByText("Now 10:41")).toBeInTheDocument();
  expect(screen.getByText("05:00")).toBeInTheDocument();
  expect(screen.getByText("21:00")).toBeInTheDocument();
});

test("TODAY-13 the ribbon labels the ends and the time now", () => {
  openDay({ kind: "none" }, at(10, 41));

  expect(screen.getByText("Now 10:41 AM")).toBeInTheDocument();
  expect(screen.getByText("5 AM")).toBeInTheDocument();
  expect(screen.getByText("9 PM")).toBeInTheDocument();
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
    />,
  );

  expect(container.querySelector(".lucide-sunset")).not.toBeInTheDocument();
});

test("TODAY-13 the open day has no Next on the calendar tile and no button", () => {
  openDay({ kind: "none" }, at(10, 41));

  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByText("Next on the calendar")).not.toBeInTheDocument();
});
