import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavBar } from "./NavBar";

const NAMES = ["Today", "Calendar", "Weather", "Notes", "Photos", "Settings"];

test("SHELL-01 shows the six views in order with Settings last", () => {
  render(<NavBar active="today" compact={false} onNavigate={vi.fn()} />);

  const nav = screen.getByRole("navigation", { name: "Views" });

  expect(
    within(nav)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label")),
  ).toEqual(NAMES);
});

test("SHELL-02 marks only the active view as the current page", () => {
  render(<NavBar active="settings" compact={false} onNavigate={vi.fn()} />);

  expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "Today" })).not.toHaveAttribute("aria-current");
});

test("SHELL-03 no view is current when none is active", () => {
  render(<NavBar compact={false} onNavigate={vi.fn()} />);

  for (const name of NAMES) {
    expect(screen.getByRole("button", { name })).not.toHaveAttribute("aria-current");
  }
});

test("SHELL-01 tapping a view asks to go to its route", async () => {
  const onNavigate = vi.fn();

  render(<NavBar active="today" compact onNavigate={onNavigate} />);

  await userEvent.click(screen.getByRole("button", { name: "Weather" }));

  expect(onNavigate).toHaveBeenCalledWith("/weather");
});
