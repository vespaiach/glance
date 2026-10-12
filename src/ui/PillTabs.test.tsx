import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PillTabs } from "./PillTabs";

const units = [
  { value: "f", label: "°F" },
  { value: "c", label: "°C" },
];

test("spec§4.2 PillTabs is a tablist with the current value selected", () => {
  render(<PillTabs options={units} value="c" onChange={() => {}} />);

  expect(screen.getByRole("tablist")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "°C" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: "°F" })).toHaveAttribute("aria-selected", "false");
});

test("spec§4.2 PillTabs reports the value of the tapped option", async () => {
  const onChange = vi.fn();
  render(<PillTabs options={units} value="c" onChange={onChange} />);

  await userEvent.click(screen.getByRole("tab", { name: "°F" }));

  expect(onChange).toHaveBeenCalledWith("f");
});

test("spec§4.2 PillTabs accepts plain strings as options", async () => {
  const onChange = vi.fn();
  render(<PillTabs options={["12h", "24h"]} value="12h" onChange={onChange} />);

  await userEvent.click(screen.getByRole("tab", { name: "24h" }));

  expect(screen.getByRole("tab", { name: "12h" })).toHaveAttribute("aria-selected", "true");
  expect(onChange).toHaveBeenCalledWith("24h");
});
