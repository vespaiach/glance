import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { viewForPath } from "./routes";
import { SidebarDrawer } from "./SidebarDrawer";

const ROWS = ["Today", "Calendar", "Weather", "Notes", "Photos", "Ambient screen", "Settings"];

function rowNames(): string[] {
  const nav = screen.getByRole("navigation", { name: "Main" });

  return within(nav)
    .getAllByRole("button")
    .map((button) => button.getAttribute("aria-label") ?? button.textContent ?? "");
}

test("SHELL-08 the drawer has the Glance header and a Close row named Close sidebar", () => {
  render(<SidebarDrawer open active="today" onClose={vi.fn()} onNavigate={vi.fn()} />);

  const nav = screen.getByRole("navigation", { name: "Main" });

  expect(within(nav).getByText("Glance")).toBeInTheDocument();
  expect(within(nav).getByRole("button", { name: "Close sidebar" })).toHaveTextContent("Close");
});

test("SHELL-01 the drawer lists the five views, then Ambient and Settings, then Close last", () => {
  render(<SidebarDrawer open active="today" onClose={vi.fn()} onNavigate={vi.fn()} />);

  expect(rowNames()).toEqual([...ROWS, "Close sidebar"]);
  expect(screen.getByRole("button", { name: "Ambient screen" })).toHaveTextContent("Ambient");
});

test("SHELL-02 marks only the active view's row as the current page", () => {
  render(<SidebarDrawer open active="calendar" onClose={vi.fn()} onNavigate={vi.fn()} />);

  expect(screen.getByRole("button", { name: "Calendar" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "Today" })).not.toHaveAttribute("aria-current");
});

test("SHELL-02 the Settings row stays active on its sub-pages and Ambient never is", () => {
  render(
    <SidebarDrawer
      open
      active={viewForPath("/settings/background")}
      onClose={vi.fn()}
      onNavigate={vi.fn()}
    />,
  );

  expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "Ambient screen" })).not.toHaveAttribute(
    "aria-current",
  );
});

test("SHELL-09 the drawer is inert while closed", () => {
  const { container, rerender } = render(
    <SidebarDrawer open={false} active="today" onClose={vi.fn()} onNavigate={vi.fn()} />,
  );

  expect(container.querySelector("nav")).toHaveAttribute("inert");

  rerender(<SidebarDrawer open active="today" onClose={vi.fn()} onNavigate={vi.fn()} />);

  expect(container.querySelector("nav")).not.toHaveAttribute("inert");
});

test("SHELL-08 Close asks to close the sidebar", async () => {
  const onClose = vi.fn();

  render(<SidebarDrawer open active="today" onClose={onClose} onNavigate={vi.fn()} />);

  await userEvent.click(screen.getByRole("button", { name: "Close sidebar" }));

  expect(onClose).toHaveBeenCalledOnce();
});

test.each([
  ["Photos", "/photos"],
  ["Settings", "/settings"],
  ["Ambient screen", "/ambient"],
])("SHELL-08 picking the %s row asks to go to %s", async (name, path) => {
  const onNavigate = vi.fn();

  render(<SidebarDrawer open active="today" onClose={vi.fn()} onNavigate={onNavigate} />);

  await userEvent.click(screen.getByRole("button", { name }));

  expect(onNavigate).toHaveBeenCalledWith(path);
});

function scrim(): Element | null {
  return screen.getByRole("navigation", { name: "Main" }).previousElementSibling;
}

test("SHELL-08 on a phone tapping the scrim asks to go back to the rail", async () => {
  const onScrimTap = vi.fn();

  render(
    <SidebarDrawer
      open
      phone
      active="today"
      onClose={vi.fn()}
      onScrimTap={onScrimTap}
      onNavigate={vi.fn()}
    />,
  );

  await userEvent.click(scrim() as HTMLElement);

  expect(onScrimTap).toHaveBeenCalledOnce();
});

test("SHELL-08 the drawer has no scrim off the phone or while closed", () => {
  const { rerender } = render(
    <SidebarDrawer open active="today" onClose={vi.fn()} onNavigate={vi.fn()} />,
  );

  expect(scrim()).toBeNull();

  rerender(
    <SidebarDrawer open={false} phone active="today" onClose={vi.fn()} onNavigate={vi.fn()} />,
  );

  expect(scrim()).toBeNull();
});
