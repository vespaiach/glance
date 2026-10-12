import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthGrid } from "./MonthGrid";

test("spec§4.2 MonthGrid shows the month title, weekday initials and every day", () => {
  render(<MonthGrid year={2026} month={9} />);

  expect(screen.getByText("October 2026")).toBeInTheDocument();
  expect(screen.getAllByText("S")).toHaveLength(2);
  expect(screen.getAllByRole("button")).toHaveLength(31);
  expect(screen.getByRole("button", { name: "Friday, October 9" })).toHaveTextContent("9");
});

test("spec§4.2 MonthGrid hides the title when showTitle is false", () => {
  render(<MonthGrid year={2026} month={9} showTitle={false} />);

  expect(screen.queryByText("October 2026")).not.toBeInTheDocument();
});

test("CAL-01 MonthGrid marks the selected day pressed and today as the current date", () => {
  render(<MonthGrid year={2026} month={9} selected={14} today={9} />);

  expect(screen.getByRole("button", { name: "Wednesday, October 14" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "Friday, October 9" })).toHaveAttribute(
    "aria-current",
    "date",
  );
  expect(screen.getByRole("button", { name: "Friday, October 9" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("CAL-01 MonthGrid reports the tapped day", async () => {
  const onSelect = vi.fn();
  render(<MonthGrid year={2026} month={9} onSelect={onSelect} />);

  await userEvent.click(screen.getByRole("button", { name: "Tuesday, October 20" }));

  expect(onSelect).toHaveBeenCalledWith(20);
});
