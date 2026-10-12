import { render, screen } from "@testing-library/react";
import { Clock } from "./Clock";

const morning = new Date(2026, 9, 9, 10, 41);

test("TIME-01 Clock shows the 12-hour time with a separate AM/PM and the date", () => {
  render(<Clock time={morning} />);

  expect(screen.getByText("10:41")).toBeInTheDocument();
  expect(screen.getByText("AM")).toBeInTheDocument();
  expect(screen.getByText("Friday, October 9")).toBeInTheDocument();
});

test("TIME-01 Clock in 24-hour pads the hour and drops AM/PM", () => {
  render(<Clock time={new Date(2026, 9, 9, 9, 5)} hour12={false} />);

  expect(screen.getByText("09:05")).toBeInTheDocument();
  expect(screen.queryByText("AM")).not.toBeInTheDocument();
});

test("spec§4.2 Clock hides the date when showDate is false", () => {
  render(<Clock time={morning} showDate={false} />);

  expect(screen.queryByText("Friday, October 9")).not.toBeInTheDocument();
});

test("spec§4.2 Clock follows a live Date when the time prop changes", () => {
  const { rerender } = render(<Clock time={morning} />);

  rerender(<Clock time={new Date(2026, 9, 9, 13, 2)} />);

  expect(screen.getByText("1:02")).toBeInTheDocument();
  expect(screen.getByText("PM")).toBeInTheDocument();
});
