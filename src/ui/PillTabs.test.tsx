import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PillTabs } from "./PillTabs";

const units = [
  { value: "f", label: "°F" },
  { value: "c", label: "°C" },
];

test("A11Y-02 PillTabs is a group of buttons with the current value pressed", () => {
  render(<PillTabs options={units} value="c" onChange={() => {}} />);

  expect(screen.getByRole("group")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "°C" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "°F" })).toHaveAttribute("aria-pressed", "false");
});

test("spec§4.2 PillTabs reports the value of the tapped option", async () => {
  const onChange = vi.fn();
  render(<PillTabs options={units} value="c" onChange={onChange} />);

  await userEvent.click(screen.getByRole("button", { name: "°F" }));

  expect(onChange).toHaveBeenCalledWith("f");
});

test("spec§4.2 PillTabs accepts plain strings as options", async () => {
  const onChange = vi.fn();
  render(<PillTabs options={["12h", "24h"]} value="12h" onChange={onChange} />);

  await userEvent.click(screen.getByRole("button", { name: "24h" }));

  expect(screen.getByRole("button", { name: "12h" })).toHaveAttribute("aria-pressed", "true");
  expect(onChange).toHaveBeenCalledWith("24h");
});

test("A11Y-02 PillTabs names its group with the label", () => {
  render(<PillTabs label="Temperature" options={units} value="c" onChange={() => {}} />);

  expect(screen.getByRole("group", { name: "Temperature" })).toBeInTheDocument();
});
