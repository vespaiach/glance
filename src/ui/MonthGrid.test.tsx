import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthGrid, type MonthGridDay } from "./MonthGrid";

const DAYS: MonthGridDay[] = Array.from({ length: 31 }, (_, index) => ({
  key: `2026-10-${String(index + 1).padStart(2, "0")}`,
  date: index + 1,
  name: `October ${index + 1}`,
  marked: index + 1 === 9 || index + 1 === 14,
}));

function renderGrid(selected = "2026-10-14") {
  const onSelect = vi.fn();

  render(
    <MonthGrid
      days={DAYS}
      leading={4}
      weekdays={["S", "M", "T", "W", "T", "F", "S"]}
      selected={selected}
      today="2026-10-09"
      cell={44}
      onSelect={onSelect}
    />,
  );

  return onSelect;
}

const day = (name: string) => screen.getByRole("button", { name });

test("CAL-03 every day of the month is a button named by its date", () => {
  renderGrid();

  expect(screen.getAllByRole("button")).toHaveLength(31);
  expect(day("October 1")).toHaveTextContent("1");
});

test("CAL-03 the selected day is pressed and today is current", () => {
  renderGrid();

  expect(day("October 14")).toHaveAttribute("aria-pressed", "true");
  expect(day("October 9")).toHaveAttribute("aria-pressed", "false");
  expect(day("October 9")).toHaveAttribute("aria-current", "date");
  expect(day("October 14")).not.toHaveAttribute("aria-current");
});

test("CAL-03 days with plans carry a dot", () => {
  renderGrid();

  expect(day("October 9").querySelector("[data-marked]")).not.toBeNull();
  expect(day("October 10").querySelector("[data-marked]")).toBeNull();
});

test("CAL-03 a day reports its key", async () => {
  const onSelect = renderGrid();

  await userEvent.click(day("October 20"));

  expect(onSelect).toHaveBeenCalledWith("2026-10-20");
});

test("CAL-03 a selection outside this month presses no day", () => {
  renderGrid("2026-11-02");

  expect(screen.queryByRole("button", { pressed: true })).not.toBeInTheDocument();
});
