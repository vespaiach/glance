import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavBar } from "./NavBar";

const NAMES = ["Today", "Calendar", "Weather", "Notes", "Photos", "Ambient screen", "Settings"];

const LABELS = ["Today", "Calendar", "Weather", "Notes", "Photos", "Ambient", "Settings"];

function buttonNames(): (string | null)[] {
  const nav = screen.getByRole("navigation", { name: "Views" });

  return within(nav)
    .getAllByRole("button")
    .map((button) => button.getAttribute("aria-label"));
}

test.each(["wide", "mid", "narrow", "phone"] as const)(
  "SHELL-01 shows the seven buttons in order with Ambient before Settings on %s",
  (breakpoint) => {
    render(<NavBar active="today" breakpoint={breakpoint} onNavigate={vi.fn()} />);

    expect(buttonNames()).toEqual(NAMES);
  },
);

test("SHELL-02 marks only the active view as the current page", () => {
  render(<NavBar active="settings" breakpoint="wide" onNavigate={vi.fn()} />);

  expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "Today" })).not.toHaveAttribute("aria-current");
  expect(screen.getByRole("button", { name: "Ambient screen" })).not.toHaveAttribute(
    "aria-current",
  );
});

test("SHELL-03 no view is current when none is active", () => {
  render(<NavBar breakpoint="wide" onNavigate={vi.fn()} />);

  for (const name of NAMES) {
    expect(screen.getByRole("button", { name })).not.toHaveAttribute("aria-current");
  }
});

test("SHELL-01 tapping a view asks to go to its route", async () => {
  const onNavigate = vi.fn();

  render(<NavBar active="today" breakpoint="phone" onNavigate={onNavigate} />);

  await userEvent.click(screen.getByRole("button", { name: "Weather" }));

  expect(onNavigate).toHaveBeenCalledWith("/weather");
});

test("AMB-08 tapping Ambient screen opens the Ambient screen", async () => {
  const onNavigate = vi.fn();

  render(<NavBar active="notes" breakpoint="wide" onNavigate={onNavigate} />);

  await userEvent.click(screen.getByRole("button", { name: "Ambient screen" }));

  expect(onNavigate).toHaveBeenCalledWith("/ambient");
});

test.each(["wide", "mid"] as const)(
  "SHELL-01 shows a label under each icon on %s",
  (breakpoint) => {
    render(<NavBar active="today" breakpoint={breakpoint} onNavigate={vi.fn()} />);

    for (const label of LABELS) {
      expect(screen.getByText(label)).toHaveAttribute("aria-hidden", "true");
    }
  },
);

test.each(["narrow", "phone"] as const)("SHELL-01 shows icons only on %s", (breakpoint) => {
  render(<NavBar active="today" breakpoint={breakpoint} onNavigate={vi.fn()} />);

  for (const label of LABELS) {
    expect(screen.queryByText(label)).toBeNull();
  }
});

test("SHELL-01 tapping a label works like its icon", async () => {
  const onNavigate = vi.fn();

  render(<NavBar active="today" breakpoint="mid" onNavigate={onNavigate} />);

  await userEvent.click(screen.getByText("Photos"));

  expect(onNavigate).toHaveBeenCalledWith("/photos");
});
