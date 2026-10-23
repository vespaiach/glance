import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker, type PickerMonthView } from "./DatePicker";

const month = (key: string, label: string, length: number): PickerMonthView => ({
  key,
  label,
  leading: 0,
  days: Array.from({ length }, (_, index) => ({
    key: `${key}-${String(index + 1).padStart(2, "0")}`,
    date: index + 1,
    name: `${label.split(" ")[0]} ${index + 1}`,
    marked: false,
  })),
});

const MONTHS: PickerMonthView[] = [
  month("2026-09", "September 2026", 30),
  month("2026-10", "October 2026", 31),
  month("2026-11", "November 2026", 30),
];

function renderPicker(selected = "2026-10-10") {
  const handlers = { onSelect: vi.fn(), onToday: vi.fn(), onClose: vi.fn() };

  render(
    <DatePicker months={MONTHS} selected={selected} today="2026-10-09" cell={44} {...handlers} />,
  );

  return handlers;
}

const dialog = () => screen.getByRole("dialog", { name: "Pick a date" });

const previous = () => screen.getByRole("button", { name: "Previous month" });

const next = () => screen.getByRole("button", { name: "Next month" });

test("CAL-03 opens on the selected day's month with the day pressed and today current", () => {
  renderPicker();

  expect(within(dialog()).getByText("October 2026")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "October 10" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "October 9" })).toHaveAttribute("aria-current", "date");
});

test("CAL-03 previous and next step a month", async () => {
  renderPicker();

  await userEvent.click(next());

  expect(within(dialog()).getByText("November 2026")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "November 30" })).toBeInTheDocument();

  await userEvent.click(previous());
  await userEvent.click(previous());

  expect(within(dialog()).getByText("September 2026")).toBeInTheDocument();
});

test("CAL-03 the month buttons stop at the ends of the range", async () => {
  renderPicker("2026-09-03");

  expect(previous()).toBeDisabled();
  expect(next()).toBeEnabled();

  await userEvent.click(next());
  await userEvent.click(next());

  expect(within(dialog()).getByText("November 2026")).toBeInTheDocument();
  expect(next()).toBeDisabled();
  expect(previous()).toBeEnabled();
});

test("CAL-03 a day selects it", async () => {
  const { onSelect, onClose } = renderPicker();

  await userEvent.click(next());
  await userEvent.click(screen.getByRole("button", { name: "November 1" }));

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
