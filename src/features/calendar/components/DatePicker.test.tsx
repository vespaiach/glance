import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker, type PickerMonthView } from "./DatePicker";

const LILAC = { id: "an", color: "lilac" } as const;

const SKY = { id: "mom", color: "sky" } as const;

const MONTHS: PickerMonthView[] = [
  {
    key: "2026-10",
    label: "October 2026",
    days: [
      { key: "2026-10-08", weekday: "Thu", date: 8, name: "Thursday, October 8", dots: [] },
      { key: "2026-10-09", weekday: "Fri", date: 9, name: "Friday, October 9", dots: [LILAC, SKY] },
      { key: "2026-10-10", weekday: "Sat", date: 10, name: "Saturday, October 10", dots: [] },
    ],
  },
  {
    key: "2026-11",
    label: "November 2026",
    days: [{ key: "2026-11-01", weekday: "Sun", date: 1, name: "Sunday, November 1", dots: [SKY] }],
  },
];

function renderPicker(selected = "2026-10-10") {
  const handlers = { onSelect: vi.fn(), onToday: vi.fn(), onClose: vi.fn() };

  render(<DatePicker months={MONTHS} selected={selected} today="2026-10-09" {...handlers} />);

  return handlers;
}

const dialog = () => screen.getByRole("dialog", { name: "Pick a date" });

test("CAL-03 lists each month under its header with the selected day pressed and today ringed", () => {
  renderPicker();

  expect(within(dialog()).getByText("October 2026")).toBeInTheDocument();
  expect(within(dialog()).getByText("November 2026")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Saturday, October 10" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const today = screen.getByRole("button", { name: "Friday, October 9" });
  expect(today).toHaveAttribute("aria-pressed", "false");
  expect(today).toHaveAttribute("aria-current", "date");
  expect(within(today).getByText("Today")).toBeInTheDocument();
});

test("CAL-03 a day selects it", async () => {
  const { onSelect, onClose } = renderPicker();

  await userEvent.click(screen.getByRole("button", { name: "Sunday, November 1" }));

  expect(onSelect).toHaveBeenCalledWith("2026-11-01");
  expect(onClose).not.toHaveBeenCalled();
});

test("CAL-03 Today picks today", async () => {
  const { onToday, onSelect } = renderPicker();

  await userEvent.click(screen.getByRole("button", { name: "Today" }));

  expect(onToday).toHaveBeenCalledOnce();
  expect(onSelect).not.toHaveBeenCalled();
});

test("CAL-03 Close, Escape and the scrim close without a pick", async () => {
  const { onClose, onSelect } = renderPicker();

  await userEvent.click(screen.getByRole("button", { name: "Close" }));
  await userEvent.keyboard("{Escape}");
  await userEvent.click(dialog().previousElementSibling as HTMLElement);

  expect(onClose).toHaveBeenCalledTimes(3);
  expect(onSelect).not.toHaveBeenCalled();
});

test("CAL-03 opens with focus in the dialog", () => {
  renderPicker();

  expect(dialog()).toHaveFocus();
});

test("A11Y-02 Tab stays inside the picker", async () => {
  renderPicker();

  for (let step = 0; step < 8; step += 1) {
    await userEvent.tab();
    expect(dialog()).toContainElement(document.activeElement as HTMLElement);
  }
});
