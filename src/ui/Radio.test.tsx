import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Radio } from "./Radio";

const CLOCKS = [
  { value: "12h", label: "12-hour" },
  { value: "24h", label: "24-hour" },
] as const;

const SEASONS = [
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" },
] as const;

test("A11Y-02 Radio is a named radiogroup with the chosen radio checked", () => {
  render(<Radio label="Clock" options={CLOCKS} value="24h" onChange={() => {}} />);

  expect(screen.getByRole("radiogroup", { name: "Clock" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "24-hour" })).toHaveAttribute("aria-checked", "true");
  expect(screen.getByRole("radio", { name: "12-hour" })).toHaveAttribute("aria-checked", "false");
});

test("SET-04 tapping a radio chooses it", async () => {
  const onChange = vi.fn();
  render(<Radio label="Clock" options={CLOCKS} value="12h" onChange={onChange} />);

  await userEvent.click(screen.getByRole("radio", { name: "24-hour" }));

  expect(onChange).toHaveBeenCalledWith("24h");
});

test("A11Y-02 only the checked radio is in the tab order", async () => {
  render(<Radio label="Season" options={SEASONS} value="summer" onChange={() => {}} />);

  await userEvent.tab();

  expect(screen.getByRole("radio", { name: "Summer" })).toHaveFocus();
  expect(screen.getByRole("radio", { name: "Spring" })).toHaveAttribute("tabindex", "-1");
});

test.each([
  ["{ArrowRight}", "fall"],
  ["{ArrowDown}", "fall"],
  ["{ArrowLeft}", "spring"],
  ["{ArrowUp}", "spring"],
])("A11Y-02 %s chooses and focuses the neighbouring radio", async (key, next) => {
  const onChange = vi.fn();
  render(<Radio label="Season" options={SEASONS} value="summer" onChange={onChange} />);

  screen.getByRole("radio", { name: "Summer" }).focus();
  await userEvent.keyboard(key);

  expect(onChange).toHaveBeenCalledWith(next);
  expect(screen.getByRole("radio", { name: next === "fall" ? "Fall" : "Spring" })).toHaveFocus();
});

test("A11Y-02 the arrow keys wrap around the ends", async () => {
  const onChange = vi.fn();
  render(<Radio label="Season" options={SEASONS} value="fall" onChange={onChange} />);

  screen.getByRole("radio", { name: "Fall" }).focus();
  await userEvent.keyboard("{ArrowRight}");

  expect(onChange).toHaveBeenCalledWith("spring");
  expect(screen.getByRole("radio", { name: "Spring" })).toHaveFocus();
});
