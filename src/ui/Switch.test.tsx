import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "./Switch";

test("EVT-08 Switch is a switch named by its label and checked when on", () => {
  render(<Switch label="All day" checked onChange={() => {}} />);

  expect(screen.getByRole("switch", { name: "All day" })).toHaveAttribute("aria-checked", "true");
});

test("EVT-08 Switch reads not checked when off", () => {
  render(<Switch label="All day" checked={false} onChange={() => {}} />);

  expect(screen.getByRole("switch", { name: "All day" })).toHaveAttribute("aria-checked", "false");
});

test("EVT-08 tapping the label turns the switch on", async () => {
  const onChange = vi.fn();
  render(<Switch label="All day" checked={false} onChange={onChange} />);

  await userEvent.click(screen.getByText("All day"));

  expect(onChange).toHaveBeenCalledWith(true);
});

test("EVT-08 tapping an on switch turns it off", async () => {
  const onChange = vi.fn();
  render(<Switch label="All day" checked onChange={onChange} />);

  await userEvent.click(screen.getByRole("switch"));

  expect(onChange).toHaveBeenCalledWith(false);
});

test("A11Y Space toggles the focused switch", async () => {
  const onChange = vi.fn();
  render(<Switch label="All day" checked={false} onChange={onChange} />);

  screen.getByRole("switch").focus();
  await userEvent.keyboard(" ");

  expect(onChange).toHaveBeenCalledWith(true);
});
