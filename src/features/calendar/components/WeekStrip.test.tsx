import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { WeekStrip } from "./WeekStrip";

const KEYS = [
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
  "2026-10-10",
];

const DAYS = KEYS.map((key, index) => ({
  key,
  weekday: "Day",
  date: 4 + index,
  name: `October ${4 + index}`,
  dots: [],
}));

function Strip({ selected = "2026-10-09" }: { selected?: string }) {
  const [day, setDay] = useState(selected);

  return (
    <WeekStrip
      heading={{ year: "2026", month: "October" }}
      label="Week"
      days={DAYS}
      selected={day}
      today="2026-10-09"
      breakpoint="wide"
      previousLabel="Previous week"
      nextLabel="Next week"
      onPrevious={vi.fn()}
      onNext={vi.fn()}
      onSelect={setDay}
    />
  );
}

test("CAL-01 shows the year over the month name", () => {
  render(<Strip />);

  expect(screen.getByText("2026")).toBeInTheDocument();
  expect(screen.getByText("October")).toBeInTheDocument();
});

test("CAL-01 marks the selected day pressed and today current, and the indicator follows a tap", async () => {
  render(<Strip selected="2026-10-05" />);

  expect(screen.getByRole("button", { name: "October 5" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "October 9" })).toHaveAttribute("aria-current", "date");
  expect(screen.getByTestId("week-indicator")).toHaveAttribute("data-day", "2026-10-05");

  await userEvent.click(screen.getByRole("button", { name: "October 8" }));

  expect(screen.getByRole("button", { name: "October 8" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByTestId("week-indicator")).toHaveAttribute("data-day", "2026-10-08");
});
