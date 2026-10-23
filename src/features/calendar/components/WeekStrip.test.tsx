import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { type WeekDay, WeekStrip } from "./WeekStrip";

const KEYS = [
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
  "2026-10-10",
];

const LILAC = { id: "an", color: "lilac" } as const;

const SKY = { id: "mom", color: "sky" } as const;

const DAYS: WeekDay[] = KEYS.map((key, index) => ({
  key,
  weekday: "Day",
  date: 4 + index,
  name: `October ${4 + index}`,
  count: undefined,
  dots: [],
}));

const BUSY: WeekDay[] = DAYS.map((day) =>
  day.key === "2026-10-09"
    ? {
        ...day,
        count: "6 events",
        dots: [LILAC, SKY],
        forecast: { icon: "sun", label: "Clear", high: "68°" },
      }
    : day,
);

type StripProps = {
  selected?: string;
  days?: WeekDay[];
  wide?: boolean;
  onAddEvent?: () => void;
};

function Strip({ selected = "2026-10-09", days = DAYS, wide = false, onAddEvent }: StripProps) {
  const [day, setDay] = useState(selected);

  return (
    <WeekStrip
      range="Oct 4 – 10"
      month="October"
      label="Week"
      days={days}
      selected={day}
      today="2026-10-09"
      wide={wide}
      previousLabel="Previous week"
      nextLabel="Next week"
      onPrevious={vi.fn()}
      onNext={vi.fn()}
      onSelect={setDay}
      onAddEvent={onAddEvent ?? vi.fn()}
    />
  );
}

function gridWidth(width: number) {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(120);
}

const friday = () => screen.getByRole("button", { name: "October 9" });

afterEach(() => {
  vi.restoreAllMocks();
});

test("CAL-01 shows the week range over the month name", () => {
  render(<Strip />);

  expect(screen.getByText("Oct 4 – 10")).toBeInTheDocument();
  expect(screen.getByText("October")).toBeInTheDocument();
});

test("CAL-01 marks the selected day pressed and today current, and a tap moves the selection", async () => {
  render(<Strip selected="2026-10-05" />);

  expect(screen.getByRole("button", { name: "October 5" })).toHaveAttribute("aria-pressed", "true");
  expect(friday()).toHaveAttribute("aria-pressed", "false");
  expect(friday()).toHaveAttribute("aria-current", "date");
  expect(screen.queryByTestId("week-indicator")).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "October 8" }));

  expect(screen.getByRole("button", { name: "October 8" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "October 5" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("CAL-01 cells at least 120 px wide show the event count instead of dots", () => {
  gridWidth(7 * 120 + 6 * 2);

  render(<Strip days={BUSY} />);

  expect(within(friday()).getByText("6 events")).toBeInTheDocument();
  expect(within(friday()).queryAllByTestId("week-dot")).toHaveLength(0);
});

test("CAL-01 narrower cells show a dot per tag instead of the count", () => {
  gridWidth(7 * 119 + 6 * 2);

  render(<Strip days={BUSY} />);

  expect(within(friday()).queryByText("6 events")).not.toBeInTheDocument();
  expect(within(friday()).getAllByTestId("week-dot")).toHaveLength(2);
});

test("CAL-01 the forecast shows on cells at least 56 px wide", () => {
  gridWidth(7 * 56 + 6 * 2);

  render(<Strip days={BUSY} />);

  expect(within(friday()).getByRole("img", { name: "Clear" })).toBeInTheDocument();
  expect(within(friday()).getByText("68°")).toBeInTheDocument();
});

test("CAL-01 cells narrower than 56 px drop the forecast", () => {
  gridWidth(7 * 55 + 6 * 2);

  render(<Strip days={BUSY} />);

  expect(within(friday()).queryByRole("img", { name: "Clear" })).not.toBeInTheDocument();
});

test("CAL-07 Add event is a labelled pill on wide windows", async () => {
  const onAddEvent = vi.fn();

  render(<Strip wide onAddEvent={onAddEvent} />);

  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  expect(screen.getByText("Add event")).toBeInTheDocument();
  expect(onAddEvent).toHaveBeenCalledOnce();
});

test("CAL-07 Add event is an icon button on narrower windows", async () => {
  const onAddEvent = vi.fn();

  render(<Strip onAddEvent={onAddEvent} />);

  await userEvent.click(screen.getByRole("button", { name: "Add event" }));

  expect(screen.queryByText("Add event")).not.toBeInTheDocument();
  expect(onAddEvent).toHaveBeenCalledOnce();
});
