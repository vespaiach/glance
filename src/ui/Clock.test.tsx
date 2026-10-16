import { render, screen } from "@testing-library/react";
import { deviceTimeZone } from "@/domain/zone";
import { Clock } from "./Clock";
import { clockTime } from "./testClock";

const tz = deviceTimeZone();

const morning = new Date(2026, 9, 9, 10, 41);

test("TIME-01 Clock shows the 12-hour time with a separate AM/PM and the date", () => {
  render(<Clock tz={tz} time={morning} />);

  expect(screen.getByText(clockTime("10:41"))).toBeInTheDocument();
  expect(screen.getByText("AM")).toBeInTheDocument();
  expect(screen.getByText("Friday, October 9")).toBeInTheDocument();
});

test("TIME-01 Clock in 24-hour pads the hour and drops AM/PM", () => {
  render(<Clock tz={tz} time={new Date(2026, 9, 9, 9, 5)} hour12={false} />);

  expect(screen.getByText(clockTime("09:05"))).toBeInTheDocument();
  expect(screen.queryByText("AM")).not.toBeInTheDocument();
});

test("spec§4.2 Clock hides the date when showDate is false", () => {
  render(<Clock tz={tz} time={morning} showDate={false} />);

  expect(screen.queryByText("Friday, October 9")).not.toBeInTheDocument();
});

test("spec§4.2 Clock follows a live Date when the time prop changes", () => {
  const { rerender } = render(<Clock tz={tz} time={morning} />);

  rerender(<Clock tz={tz} time={new Date(2026, 9, 9, 13, 2)} />);

  expect(screen.getByText(clockTime("1:02"))).toBeInTheDocument();
  expect(screen.getByText("PM")).toBeInTheDocument();
});

test("LOC-06 Clock reads the time and date in the screen's zone, not the device's", () => {
  render(<Clock tz="America/Los_Angeles" time={new Date("2026-10-10T06:30:00Z")} />);

  expect(screen.getByText(clockTime("11:30"))).toBeInTheDocument();
  expect(screen.getByText("PM")).toBeInTheDocument();
  expect(screen.getByText("Friday, October 9")).toBeInTheDocument();
});
