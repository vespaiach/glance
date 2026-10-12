import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthBlock } from "./MonthBlock";

type Handlers = {
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (day: number) => void;
};

function renderBlock(handlers: Partial<Handlers> = {}) {
  return render(
    <MonthBlock
      title="October"
      year={2026}
      month={9}
      today={9}
      selected={9}
      marked={[2, 9]}
      cell={60}
      {...handlers}
    />,
  );
}

test("CAL-03 shows the month heading without repeating it in the grid", () => {
  renderBlock();

  expect(screen.getByText("October")).toBeInTheDocument();
  expect(screen.queryByText("October 2026")).not.toBeInTheDocument();
});

test("CAL-01 the selected day is pressed and today is the current date", () => {
  renderBlock();

  const today = screen.getByRole("button", { name: "Friday, October 9" });

  expect(today).toHaveAttribute("aria-pressed", "true");
  expect(today).toHaveAttribute("aria-current", "date");
});

test("CAL-03 the chevrons report a step to the previous and next month", async () => {
  const onPreviousMonth = vi.fn();
  const onNextMonth = vi.fn();
  renderBlock({ onPreviousMonth, onNextMonth });

  await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
  await userEvent.click(screen.getByRole("button", { name: "Next month" }));

  expect(onPreviousMonth).toHaveBeenCalledTimes(1);
  expect(onNextMonth).toHaveBeenCalledTimes(1);
});

test("CAL-01 tapping a day reports it", async () => {
  const onSelectDay = vi.fn();
  renderBlock({ onSelectDay });

  await userEvent.click(screen.getByRole("button", { name: "Wednesday, October 14" }));

  expect(onSelectDay).toHaveBeenCalledWith(14);
});
