import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimePicker } from "./TimePicker";

const at = (h: number, m: number) => h * 60 + m;

const labels = {
  hour: "Hour",
  minutes: "Minutes",
  length: "Length",
  noEnd: "No end time",
  done: "Done",
  hour24Cell: (hour: string) => `${hour} hundred`,
  minuteCell: (minutes: number) => `${minutes} minutes`,
};

const lengths = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hr" },
  { value: 90, label: "1.5 hr" },
  { value: 120, label: "2 hr" },
];

const starts = {
  label: "Starts",
  groupLabel: "Start time",
  clock: "12h" as const,
  labels,
  onChange: () => {},
  onDone: () => {},
};

const ends = (start: number, onNoEnd = () => {}) => ({
  ...starts,
  label: "Ends",
  groupLabel: "End time",
  ends: { start, lengths, onNoEnd },
});

const hourGroup = () => screen.getByRole("group", { name: "Hour" });

const minuteGroup = () => screen.getByRole("group", { name: "Minutes" });

test("TPK-03 TimePicker is a group named for its field with a '{label} · {time}' eyebrow", () => {
  render(<TimePicker {...starts} value={at(14, 30)} />);

  expect(screen.getByRole("group", { name: "Start time" })).toBeInTheDocument();
  expect(screen.getByText("Starts · 2:30 PM")).toBeInTheDocument();
});

test("TPK-03 12-hour TimePicker shows AM/PM tabs with the current half selected", () => {
  render(<TimePicker {...starts} value={at(14, 30)} />);

  expect(screen.getByRole("button", { name: "PM" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "AM" })).toHaveAttribute("aria-pressed", "false");
});

test("TPK-03 12-hour hour grid reads 12, 1 … 11 and presses the current hour", () => {
  render(<TimePicker {...starts} value={at(14, 30)} />);

  const cells = within(hourGroup()).getAllByRole("button");

  expect(cells.map((cell) => cell.textContent)).toEqual([
    "12",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
  ]);
  expect(within(hourGroup()).getByRole("button", { name: "2 PM" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(within(hourGroup()).getByRole("button", { name: "3 PM" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("TPK-03 24-hour TimePicker has no AM/PM buttons and an hour grid of 00 … 23", () => {
  render(<TimePicker {...starts} clock="24h" value={at(9, 5)} />);

  const cells = within(hourGroup()).getAllByRole("button");

  expect(screen.queryByRole("button", { name: "AM" })).not.toBeInTheDocument();
  expect(cells).toHaveLength(24);
  expect(cells[0]).toHaveTextContent("00");
  expect(cells[23]).toHaveTextContent("23");
  expect(screen.getByText("Starts · 09:05")).toBeInTheDocument();
});

test("TPK-03 minute grid reads 00 … 55 in 5-minute steps and presses the current minutes", () => {
  render(<TimePicker {...starts} value={at(10, 45)} />);

  const cells = within(minuteGroup()).getAllByRole("button");

  expect(cells.map((cell) => cell.textContent)).toEqual([
    "00",
    "05",
    "10",
    "15",
    "20",
    "25",
    "30",
    "35",
    "40",
    "45",
    "50",
    "55",
  ]);
  expect(within(minuteGroup()).getByRole("button", { name: "45 minutes" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("TPK-10 24-hour hour cells say '{hh} hundred' and minute cells '{n} minutes'", () => {
  render(<TimePicker {...starts} clock="24h" value={at(15, 0)} />);

  expect(screen.getByRole("button", { name: "15 hundred" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "5 minutes" })).toBeInTheDocument();
});

test("TPK-03 tapping an hour keeps the minutes", async () => {
  const onChange = vi.fn();
  render(<TimePicker {...starts} value={at(14, 30)} onChange={onChange} />);

  await userEvent.click(screen.getByRole("button", { name: "4 PM" }));

  expect(onChange).toHaveBeenCalledWith(at(16, 30));
});

test("TPK-03 tapping minutes keeps the hour", async () => {
  const onChange = vi.fn();
  render(<TimePicker {...starts} value={at(14, 30)} onChange={onChange} />);

  await userEvent.click(screen.getByRole("button", { name: "15 minutes" }));

  expect(onChange).toHaveBeenCalledWith(at(14, 15));
});

test("TPK-03 tapping AM keeps the clock hour and minutes", async () => {
  const onChange = vi.fn();
  render(<TimePicker {...starts} value={at(14, 30)} onChange={onChange} />);

  await userEvent.click(screen.getByRole("button", { name: "AM" }));

  expect(onChange).toHaveBeenCalledWith(at(2, 30));
});

test("TPK-03 Done asks to close the picker", async () => {
  const onDone = vi.fn();
  render(<TimePicker {...starts} value={at(14, 30)} onDone={onDone} />);

  await userEvent.click(screen.getByRole("button", { name: "Done" }));

  expect(onDone).toHaveBeenCalledTimes(1);
});

test("TPK-04 the Starts picker has no length chips and no 'No end time'", () => {
  render(<TimePicker {...starts} value={at(14, 30)} />);

  expect(screen.queryByRole("group", { name: "Length" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "No end time" })).not.toBeInTheDocument();
});

test("TPK-04 the Ends picker presses the length chip that matches the end", () => {
  render(<TimePicker {...ends(at(11, 0))} value={at(12, 30)} />);

  const chips = within(screen.getByRole("group", { name: "Length" }));

  expect(chips.getByRole("button", { name: "1.5 hr" })).toHaveAttribute("aria-pressed", "true");
  expect(chips.getByRole("button", { name: "1 hr" })).toHaveAttribute("aria-pressed", "false");
});

test("TPK-04 a length chip sets the end from Starts, capped at 11:55 PM", async () => {
  const onChange = vi.fn();
  render(<TimePicker {...ends(at(23, 0))} value={at(23, 30)} onChange={onChange} />);

  await userEvent.click(screen.getByRole("button", { name: "2 hr" }));

  expect(onChange).toHaveBeenCalledWith(at(23, 55));
});

test("TPK-04 'No end time' asks to clear the end", async () => {
  const onNoEnd = vi.fn();
  render(<TimePicker {...ends(at(11, 0), onNoEnd)} value={at(12, 0)} />);

  await userEvent.click(screen.getByRole("button", { name: "No end time" }));

  expect(onNoEnd).toHaveBeenCalledTimes(1);
});

test("TPK-02 TimePicker scrolls itself into view when it opens", () => {
  const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");

  render(<TimePicker {...starts} value={at(14, 30)} />);

  expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
});
