import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { viewForPath } from "./routes";
import { SidebarRail } from "./SidebarRail";

const NAMES = [
  "Today",
  "Calendar",
  "Weather",
  "Notes",
  "Photos",
  "Ambient screen",
  "Settings",
  "Hide sidebar",
];

function renderRail(props: Partial<ComponentProps<typeof SidebarRail>> = {}) {
  return render(
    <SidebarRail mode="rail" active="today" onHide={vi.fn()} onNavigate={vi.fn()} {...props} />,
  );
}

function railNames(): (string | null)[] {
  const nav = screen.getByRole("navigation", { name: "Main" });

  return within(nav)
    .getAllByRole("button")
    .map((button) => button.getAttribute("aria-label"));
}

test("SHELL-01 the rail is a Main nav with the five views, Ambient, Settings and Hide sidebar", () => {
  renderRail();

  expect(railNames()).toEqual(NAMES);
});

test("SHELL-08 the rail has no Open menu", () => {
  renderRail();

  expect(screen.queryByRole("button", { name: "Open menu" })).not.toBeInTheDocument();
});

test("SHELL-02 marks only the active view as the current page", () => {
  renderRail({ active: "notes" });

  expect(screen.getByRole("button", { name: "Notes" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "Today" })).not.toHaveAttribute("aria-current");
  expect(screen.getByRole("button", { name: "Ambient screen" })).not.toHaveAttribute(
    "aria-current",
  );
});

test("SHELL-02 Settings stays active on its sub-pages", () => {
  renderRail({ active: viewForPath("/settings/location") });

  expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("aria-current", "page");
});

test("SHELL-02 Ambient is never shown active", () => {
  renderRail({ active: viewForPath("/ambient") });

  for (const name of NAMES) {
    expect(screen.getByRole("button", { name })).not.toHaveAttribute("aria-current");
  }
});

test.each([
  ["hidden", true],
  ["rail", false],
  ["expanded", true],
] as const)("SHELL-09 a %s rail is inert: %s", (mode, inert) => {
  const { container } = renderRail({ mode });

  expect(container.querySelector("nav")?.hasAttribute("inert")).toBe(inert);
});

test("SHELL-08 ✕ asks to hide the sidebar", async () => {
  const onHide = vi.fn();

  renderRail({ onHide });

  await userEvent.click(screen.getByRole("button", { name: "Hide sidebar" }));

  expect(onHide).toHaveBeenCalledOnce();
});

test.each([
  ["Weather", "/weather"],
  ["Settings", "/settings"],
  ["Ambient screen", "/ambient"],
])("SHELL-01 tapping %s asks to go to %s", async (name, path) => {
  const onNavigate = vi.fn();

  renderRail({ onNavigate });

  await userEvent.click(screen.getByRole("button", { name }));

  expect(onNavigate).toHaveBeenCalledWith(path);
});
