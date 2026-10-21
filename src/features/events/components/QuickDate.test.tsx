import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickDate } from "./QuickDate";

function renderDate(day = "2026-10-14") {
  const handlers = { onOpen: vi.fn(), onChange: vi.fn() };

  render(<QuickDate label="Wednesday, Oct 14" day={day} today="2026-10-09" {...handlers} />);

  return handlers;
}

const trigger = () => screen.getByRole("button", { name: "Wednesday, Oct 14. Change date" });

const popover = () => screen.getByRole("dialog", { name: "Change date" });

test("EVT-12 the eyebrow is a button showing the date, with the popover closed", () => {
  renderDate();

  expect(trigger()).toHaveAttribute("aria-expanded", "false");
  expect(trigger()).toHaveTextContent("Wednesday, Oct 14");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("EVT-12 opening shows the chips and the month of the selected day", async () => {
  const { onOpen } = renderDate();

  await userEvent.click(trigger());

  expect(onOpen).toHaveBeenCalledOnce();
  expect(trigger()).toHaveAttribute("aria-expanded", "true");
  expect(within(popover()).getByRole("button", { name: "Today" })).toBeInTheDocument();
  expect(within(popover()).getByRole("button", { name: "Tomorrow" })).toBeInTheDocument();
  expect(within(popover()).getByRole("button", { name: "Next week" })).toBeInTheDocument();
  expect(within(popover()).getByText("October 2026")).toBeInTheDocument();
  expect(within(popover()).getAllByRole("button", { name: /^\w+, Oct \d+$/ })).toHaveLength(31);
});

test.each([
  ["Today", "2026-10-09"],
  ["Tomorrow", "2026-10-10"],
  ["Next week", "2026-10-21"],
])("EVT-12 the %s chip sets %s and closes", async (name, day) => {
  const { onChange } = renderDate();

  await userEvent.click(trigger());
  await userEvent.click(within(popover()).getByRole("button", { name }));

  expect(onChange).toHaveBeenCalledWith(day);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("EVT-12 a day in the grid sets the date and closes", async () => {
  const { onChange } = renderDate();

  await userEvent.click(trigger());
  await userEvent.click(screen.getByRole("button", { name: "Saturday, Oct 24" }));

  expect(onChange).toHaveBeenCalledWith("2026-10-24");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("EVT-12 the selected day is pressed and today is current", async () => {
  renderDate();

  await userEvent.click(trigger());

  expect(screen.getByRole("button", { name: "Wednesday, Oct 14" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "Friday, Oct 9" })).toHaveAttribute(
    "aria-current",
    "date",
  );
});

test("EVT-12 the arrows page through months without changing the date", async () => {
  const { onChange } = renderDate();

  await userEvent.click(trigger());
  await userEvent.click(screen.getByRole("button", { name: "Next month" }));

  expect(within(popover()).getByText("November 2026")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
  await userEvent.click(screen.getByRole("button", { name: "Previous month" }));

  expect(within(popover()).getByText("September 2026")).toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});

test("EVT-12 a tap outside closes without a change", async () => {
  const { onChange } = renderDate();

  await userEvent.click(trigger());
  await userEvent.click(popover().previousElementSibling as HTMLElement);

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});

test("EVT-12 the eyebrow again closes without a change", async () => {
  const { onChange } = renderDate();

  await userEvent.click(trigger());
  await userEvent.click(trigger());

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});

test("EVT-12 Escape closes without a change", async () => {
  const { onChange } = renderDate();

  await userEvent.click(trigger());
  await userEvent.keyboard("{Escape}");

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});
