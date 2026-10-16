import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { viewForPath } from "./routes";
import { SidebarRail } from "./SidebarRail";

const NAMES = [
  "Open menu",
  "Today",
  "Calendar",
  "Weather",
  "Notes",
  "Photos",
  "Ambient screen",
  "Settings",
];

function railNames(): (string | null)[] {
  const nav = screen.getByRole("navigation", { name: "Main" });

  return within(nav)
    .getAllByRole("button")
    .map((button) => button.getAttribute("aria-label"));
}

test("SHELL-01 the rail is a Main nav with Open menu, the five views, Ambient and Settings", () => {
  render(<SidebarRail mode="rail" active="today" onOpen={vi.fn()} onNavigate={vi.fn()} />);

  expect(railNames()).toEqual(NAMES);
});

test("SHELL-02 marks only the active view as the current page", () => {
  render(<SidebarRail mode="rail" active="notes" onOpen={vi.fn()} onNavigate={vi.fn()} />);

  expect(screen.getByRole("button", { name: "Notes" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "Today" })).not.toHaveAttribute("aria-current");
  expect(screen.getByRole("button", { name: "Ambient screen" })).not.toHaveAttribute(
    "aria-current",
  );
});

test("SHELL-02 Settings stays active on its sub-pages", () => {
  render(
    <SidebarRail
      mode="rail"
      active={viewForPath("/settings/location")}
      onOpen={vi.fn()}
      onNavigate={vi.fn()}
    />,
  );

  expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("aria-current", "page");
});

test("SHELL-02 Ambient is never shown active", () => {
  render(
    <SidebarRail
      mode="rail"
      active={viewForPath("/ambient")}
      onOpen={vi.fn()}
      onNavigate={vi.fn()}
    />,
  );

  for (const name of NAMES) {
    expect(screen.getByRole("button", { name })).not.toHaveAttribute("aria-current");
  }
});

test.each([
  ["rail", "false"],
  ["expanded", "true"],
] as const)("SHELL-09 Open menu on a %s sidebar has aria-expanded %s", (mode, expanded) => {
  render(<SidebarRail mode={mode} active="today" onOpen={vi.fn()} onNavigate={vi.fn()} />);

  expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
    "aria-expanded",
    expanded,
  );
});

test("SHELL-09 the rail is inert while the sidebar is hidden", () => {
  const { container, rerender } = render(
    <SidebarRail mode="hidden" active="today" onOpen={vi.fn()} onNavigate={vi.fn()} />,
  );

  expect(container.querySelector("nav")).toHaveAttribute("inert");

  rerender(<SidebarRail mode="rail" active="today" onOpen={vi.fn()} onNavigate={vi.fn()} />);

  expect(container.querySelector("nav")).not.toHaveAttribute("inert");
});

test("SHELL-08 Open menu asks to expand the sidebar", async () => {
  const onOpen = vi.fn();

  render(<SidebarRail mode="rail" active="today" onOpen={onOpen} onNavigate={vi.fn()} />);

  await userEvent.click(screen.getByRole("button", { name: "Open menu" }));

  expect(onOpen).toHaveBeenCalledOnce();
});

test.each([
  ["Weather", "/weather"],
  ["Settings", "/settings"],
  ["Ambient screen", "/ambient"],
])("SHELL-01 tapping %s asks to go to %s", async (name, path) => {
  const onNavigate = vi.fn();

  render(<SidebarRail mode="rail" active="today" onOpen={vi.fn()} onNavigate={onNavigate} />);

  await userEvent.click(screen.getByRole("button", { name }));

  expect(onNavigate).toHaveBeenCalledWith(path);
});
