import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { CalendarHeader } from "./CalendarHeader";
import type { WeekDay } from "./WeekStrip";

const KEYS = [
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
  "2026-10-10",
];

const DAYS: WeekDay[] = KEYS.map((key, index) => ({
  key,
  weekday: "Day",
  date: 4 + index,
  name: `October ${4 + index}`,
  count: undefined,
  dots:
    key === "2026-10-08"
      ? [
          { id: "an", color: "lilac" },
          { id: "mom", color: "sky" },
        ]
      : [],
}));

type Props = ComponentProps<typeof CalendarHeader>;

function renderHeader(props: Partial<Props> = {}) {
  return render(
    <CalendarHeader
      range="Oct 4 – 10"
      month="October"
      label="Week of October 4"
      pickLabel="Friday, October 9. Pick a date"
      days={DAYS}
      selected="2026-10-07"
      today="2026-10-09"
      onOpenPicker={() => {}}
      onPrevious={() => {}}
      onNext={() => {}}
      onAddEvent={() => {}}
      onSelect={() => {}}
      {...props}
    />,
  );
}

test("CAL-02 the week range and month open the date picker", async () => {
  const onOpenPicker = vi.fn();
  renderHeader({ onOpenPicker });

  const month = screen.getByRole("button", { name: "Friday, October 9. Pick a date" });
  expect(month).toHaveAttribute("aria-haspopup", "dialog");
  expect(month).toHaveTextContent("Oct 4 – 10");
  expect(month).toHaveTextContent("October");

  await userEvent.click(month);

  expect(onOpenPicker).toHaveBeenCalledTimes(1);
});

test("CAL-02 previous week, next week and Add event call back", async () => {
  const onPrevious = vi.fn();
  const onNext = vi.fn();
  const onAddEvent = vi.fn();
  renderHeader({ onPrevious, onNext, onAddEvent });

  await userEvent.click(screen.getByRole("button", { name: "Previous week" }));
  await userEvent.click(screen.getByRole("button", { name: "Next week" }));
  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  expect(onPrevious).toHaveBeenCalledTimes(1);
  expect(onNext).toHaveBeenCalledTimes(1);
  expect(onAddEvent).toHaveBeenCalledTimes(1);
});

test("CAL-02 the selected day is pressed, today is current and a day selects it", async () => {
  const onSelect = vi.fn();
  renderHeader({ onSelect });

  const week = screen.getByRole("group", { name: "Week of October 4" });
  expect(within(week).getByRole("button", { name: "October 7" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(within(week).getByRole("button", { name: "October 9" })).toHaveAttribute(
    "aria-current",
    "date",
  );

  await userEvent.click(within(week).getByRole("button", { name: "October 10" }));

  expect(onSelect).toHaveBeenCalledWith("2026-10-10");
});

test("CAL-02 a day shows a person dot for each tag with plans", () => {
  renderHeader();

  const day = screen.getByRole("button", { name: "October 8" });
  expect(within(day).getAllByTestId("week-dot")).toHaveLength(2);
});
