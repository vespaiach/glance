import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createSettingsRepo } from "@/data/repos";
import { type Harness, openHarness, putSyncStatus } from "@/data/repos/testHarness";
import { AppShell } from "./AppShell";
import { IdleProvider } from "./providers/idle";
import { NetworkProvider } from "./providers/network";
import { SeasonProvider } from "./providers/season";
import { shellWrapper } from "./providers/testShell";
import { SheetHost, type SheetRequest } from "./SheetHost";

const navigation = vi.hoisted(() => {
  const push = vi.fn<(path: string) => void>();

  const prefetch = vi.fn<(path: string) => void>();

  return { pathname: "/today", push, prefetch, router: { push, prefetch } };
});

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => navigation.router,
}));

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-app-shell-test");
  navigation.pathname = "/today";
  navigation.push.mockReset();
  navigation.prefetch.mockReset();

  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();

  await store.close();
});

type Start = "default" | "rail" | "expanded";

async function renderShell(
  children: ReactNode,
  start: Start = "default",
  sheet: SheetRequest | null = null,
) {
  const Shell = shellWrapper(store);

  const wrapper = ({ children: shell }: { children: ReactNode }) => (
    <Shell>
      <SeasonProvider>
        <SheetHost initial={sheet}>
          <IdleProvider>
            <NetworkProvider pillDelayMs={0}>{shell}</NetworkProvider>
          </IdleProvider>
        </SheetHost>
      </SeasonProvider>
    </Shell>
  );

  const view = render(<AppShell>{children}</AppShell>, { wrapper });

  await screen.findByRole("main");

  startSidebar(start);

  return view;
}

function startSidebar(start: Start) {
  if (start === "default") return;

  const small = screen.queryByRole("button", { name: "Open menu" });

  act(() => (small ?? grip())?.click());

  if (start === "expanded" && !small) act(() => expandMenu().click());
}

function trackScroll(element: HTMLElement) {
  let top = 0;

  Object.defineProperty(element, "scrollTop", {
    get: () => top,
    set: (value: number) => {
      top = value;
    },
  });
}

function rail() {
  return screen.getByRole("button", { name: "Hide sidebar" }).closest("nav") as HTMLElement;
}

function drawer() {
  return screen.getByRole("button", { name: "Close sidebar" }).closest("nav") as HTMLElement;
}

function grip() {
  return screen.queryByRole("button", { name: "Show sidebar" });
}

function expandMenu() {
  return screen.getByRole("button", { name: "Expand menu" });
}

function sidebarMode() {
  if (!drawer().hasAttribute("inert")) return "expanded";

  if (!rail().hasAttribute("inert")) return "rail";

  return grip() === null ? "none" : "hidden";
}

function changeView(rerender: (ui: ReactNode) => void, pathname: string) {
  navigation.pathname = pathname;

  rerender(<AppShell>{`${pathname} view`}</AppShell>);
}

test("SHELL-01 shows the view in main next to the Main nav", async () => {
  await renderShell("Today view");

  expect(screen.getByRole("main")).toHaveTextContent("Today view");
  expect(within(rail()).getByRole("button", { name: "Today" })).toBeInTheDocument();
});

test("SHELL-08 starts Hidden: only the grip shows, the rail and the drawer are inert", async () => {
  await renderShell("Today view");

  expect(sidebarMode()).toBe("hidden");
  expect(drawer()).toHaveAttribute("inert");
});

test("SHELL-02 the rail marks the route's view", async () => {
  navigation.pathname = "/settings/background";

  await renderShell("Background view", "rail");

  expect(within(rail()).getByRole("button", { name: "Settings" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("SHELL-01 tapping a view on the rail navigates to it", async () => {
  await renderShell("Today view", "rail");

  await userEvent.click(within(rail()).getByRole("button", { name: "Notes" }));

  expect(navigation.push).toHaveBeenCalledWith("/notes");
});

test("SHELL-08 a load on Calendar starts on Rail", async () => {
  navigation.pathname = "/calendar";

  await renderShell("Calendar view");

  expect(sidebarMode()).toBe("rail");
});

test("SHELL-08 the grip shows the rail, Expand menu expands it and Close hides it", async () => {
  await renderShell("Today view");

  await userEvent.click(screen.getByRole("button", { name: "Show sidebar" }));

  expect(sidebarMode()).toBe("rail");

  await userEvent.click(expandMenu());

  expect(sidebarMode()).toBe("expanded");

  await userEvent.click(screen.getByRole("button", { name: "Close sidebar" }));

  expect(sidebarMode()).toBe("hidden");
});

test("SHELL-08 the rail's ✕ hides the sidebar", async () => {
  await renderShell("Today view", "rail");

  await userEvent.click(screen.getByRole("button", { name: "Hide sidebar" }));

  expect(sidebarMode()).toBe("hidden");
});

test("SHELL-08 going to Calendar from Hidden brings back the Rail and moves no focus", async () => {
  const { rerender } = await renderShell("Today view");

  changeView(rerender, "/calendar");

  expect(sidebarMode()).toBe("rail");
  expect(document.body).toHaveFocus();
});

test("SHELL-08 going to Today keeps a Hidden sidebar hidden", async () => {
  navigation.pathname = "/calendar";

  const { rerender } = await renderShell("Calendar view");

  await userEvent.click(screen.getByRole("button", { name: "Hide sidebar" }));

  changeView(rerender, "/today");

  expect(sidebarMode()).toBe("hidden");
});

test("SHELL-08 a view change from Expanded lands on Rail", async () => {
  const { rerender } = await renderShell("Today view", "expanded");

  changeView(rerender, "/calendar");

  expect(sidebarMode()).toBe("rail");
});

test("SHELL-08 picking a drawer row goes to that view and returns to Rail", async () => {
  await renderShell("Today view", "expanded");

  await userEvent.click(within(drawer()).getByRole("button", { name: "Weather" }));

  expect(navigation.push).toHaveBeenCalledWith("/weather");
  expect(sidebarMode()).toBe("rail");
});

test("SHELL-09 opening the drawer moves focus to the current view's row", async () => {
  navigation.pathname = "/photos";

  await renderShell("Photos view", "rail");

  await userEvent.click(expandMenu());

  expect(within(drawer()).getByRole("button", { name: "Photos" })).toHaveFocus();
});

test("SHELL-09 Escape returns to Rail and focuses Expand menu", async () => {
  await renderShell("Today view", "rail");

  await userEvent.click(expandMenu());

  await userEvent.keyboard("{Escape}");

  expect(sidebarMode()).toBe("rail");
  expect(expandMenu()).toHaveFocus();
});

test("SHELL-09 picking a drawer row focuses Expand menu", async () => {
  await renderShell("Today view", "expanded");

  await userEvent.click(within(drawer()).getByRole("button", { name: "Notes" }));

  expect(expandMenu()).toHaveFocus();
});

test("SHELL-09 Escape does nothing on Rail", async () => {
  await renderShell("Today view", "rail");

  await userEvent.keyboard("{Escape}");

  expect(sidebarMode()).toBe("rail");
});

test("SHELL-09 Close moves focus to the grip", async () => {
  await renderShell("Today view", "expanded");

  await userEvent.click(screen.getByRole("button", { name: "Close sidebar" }));

  expect(screen.getByRole("button", { name: "Show sidebar" })).toHaveFocus();
});

test("SHELL-09 the rail's ✕ moves focus to the grip", async () => {
  await renderShell("Today view", "rail");

  await userEvent.click(screen.getByRole("button", { name: "Hide sidebar" }));

  expect(screen.getByRole("button", { name: "Show sidebar" })).toHaveFocus();
});

function onSmall() {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function smallGrip() {
  return screen.getByRole("button", { name: "Open menu" });
}

test("SHELL-08 on small there is no Rail: only the Open menu grip shows", async () => {
  onSmall();

  await renderShell("Calendar view");

  expect(screen.queryByRole("button", { name: "Hide sidebar" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Expand menu" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Show sidebar" })).toBeNull();
  expect(smallGrip()).toBeVisible();
  expect(drawer()).toHaveAttribute("inert");
});

test("SHELL-08 on small the grip opens the drawer directly and focuses the current row", async () => {
  onSmall();

  await renderShell("Today view");

  await userEvent.click(smallGrip());

  expect(drawer()).not.toHaveAttribute("inert");
  expect(within(drawer()).getByRole("button", { name: "Today" })).toHaveFocus();
  expect(screen.queryByRole("button", { name: "Hide sidebar" })).toBeNull();
});

test("SHELL-08 on small Close returns to the grip and focuses it", async () => {
  onSmall();

  await renderShell("Today view", "expanded");

  await userEvent.click(screen.getByRole("button", { name: "Close sidebar" }));

  expect(drawer()).toHaveAttribute("inert");
  expect(smallGrip()).toHaveFocus();
});

test("SHELL-08 on small a scrim tap returns to the grip and focuses it", async () => {
  onSmall();

  await renderShell("Today view", "expanded");

  await userEvent.click(drawer().previousElementSibling as HTMLElement);

  expect(drawer()).toHaveAttribute("inert");
  expect(smallGrip()).toHaveFocus();
});

test("SHELL-08 on small picking a view returns to the grip", async () => {
  onSmall();

  await renderShell("Today view", "expanded");

  await userEvent.click(within(drawer()).getByRole("button", { name: "Calendar" }));

  expect(navigation.push).toHaveBeenCalledWith("/calendar");
  expect(drawer()).toHaveAttribute("inert");
  expect(smallGrip()).toHaveFocus();
});

test("SHELL-08 on small a view change returns the drawer to the grip", async () => {
  onSmall();

  const { rerender } = await renderShell("Today view", "expanded");

  changeView(rerender, "/calendar");

  expect(drawer()).toHaveAttribute("inert");
  expect(smallGrip()).toBeVisible();
});

test("SHELL-09 on small Escape closes the drawer and focuses the grip", async () => {
  onSmall();

  await renderShell("Today view", "expanded");

  await userEvent.keyboard("{Escape}");

  expect(drawer()).toHaveAttribute("inert");
  expect(smallGrip()).toHaveFocus();
});

test("SHELL-09 the grip's tap moves focus to Expand menu", async () => {
  await renderShell("Today view");

  await userEvent.click(screen.getByRole("button", { name: "Show sidebar" }));

  expect(expandMenu()).toHaveFocus();
});

test("SHELL-09 loading the page moves no focus", async () => {
  await renderShell("Today view");

  expect(document.body).toHaveFocus();
});

test("SHELL-04 changing view resets the main scroll to the top", async () => {
  const { rerender } = await renderShell("Today view");

  const main = screen.getByRole("main");

  trackScroll(main);

  main.scrollTop = 240;

  changeView(rerender, "/calendar");

  expect(main.scrollTop).toBe(0);
});

test("tech§4.5 prefetches the six views on startup", async () => {
  await renderShell("Today view");

  await waitFor(() =>
    expect(navigation.prefetch.mock.calls.map(([path]) => path)).toEqual([
      "/today",
      "/calendar",
      "/weather",
      "/notes",
      "/photos",
      "/settings",
    ]),
  );
});

async function idleBackToToday(start: Start, hidden = false) {
  await createSettingsRepo(store).update({ idleTimeout: { on: true, minutes: 1 } });

  vi.useFakeTimers({ now: new Date("2026-10-09T10:41:00"), shouldAdvanceTime: true });

  navigation.pathname = "/calendar";

  const { rerender } = await renderShell("/calendar view", start);

  if (hidden) act(() => screen.getByRole("button", { name: "Hide sidebar" }).click());

  await act(() => vi.advanceTimersByTimeAsync(200));

  act(() => vi.advanceTimersByTime(60_000));

  await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/today"));

  changeView(rerender, "/today");
}

test("IDLE-01 the idle return to Today leaves an open drawer Hidden", async () => {
  await idleBackToToday("expanded");

  expect(sidebarMode()).toBe("hidden");
});

test("IDLE-01 the idle return to Today keeps a Hidden sidebar hidden", async () => {
  await idleBackToToday("default", true);

  expect(sidebarMode()).toBe("hidden");
});

async function renderIdleShell(start: Start = "default", sheet: SheetRequest | null = null) {
  vi.useFakeTimers({ now: new Date("2026-10-09T10:41:00"), shouldAdvanceTime: true });

  navigation.pathname = "/calendar";

  await renderShell("/calendar view", start, sheet);

  await act(() => vi.advanceTimersByTimeAsync(200));
}

const seconds = (n: number) => act(() => vi.advanceTimersByTime(n * 1000));

test("SHELL-11 after 15 s without a touch the rail hides", async () => {
  await renderIdleShell();

  seconds(14);

  expect(sidebarMode()).toBe("rail");

  seconds(1);

  expect(sidebarMode()).toBe("hidden");
});

test("SHELL-11 after 15 s without a touch the open drawer closes to Hidden", async () => {
  await renderIdleShell("expanded");

  seconds(15);

  expect(sidebarMode()).toBe("hidden");
});

test("SHELL-11 a touch or a key press restarts the 15 s", async () => {
  await renderIdleShell();

  seconds(8);
  fireEvent.pointerDown(screen.getByRole("main"));
  seconds(8);
  fireEvent.keyDown(document.body, { key: "a" });
  seconds(14);

  expect(sidebarMode()).toBe("rail");

  seconds(1);

  expect(sidebarMode()).toBe("hidden");
});

test("SHELL-11 hiding when idle moves no focus", async () => {
  await renderIdleShell();

  seconds(15);

  expect(document.activeElement).toBe(document.body);
});

test("SHELL-11 the rail stays while a sheet is open", async () => {
  await renderIdleShell("default", { kind: "note", id: "n1" });

  seconds(30);

  expect(sidebarMode()).toBe("rail");
});

test("SHELL-11 the rail stays while a text field is focused and leaving it restarts the 15 s", async () => {
  vi.useFakeTimers({ now: new Date("2026-10-09T10:41:00"), shouldAdvanceTime: true });

  navigation.pathname = "/calendar";

  await renderShell(<input aria-label="Search" />);

  await act(() => vi.advanceTimersByTimeAsync(200));

  act(() => screen.getByRole("textbox", { name: "Search" }).focus());
  seconds(30);

  expect(sidebarMode()).toBe("rail");

  act(() => screen.getByRole("textbox", { name: "Search" }).blur());
  seconds(14);

  expect(sidebarMode()).toBe("rail");

  seconds(1);

  expect(sidebarMode()).toBe("hidden");
});

test("SHELL-11 tapping the grip shows the Rail and restarts the 15 s", async () => {
  await renderIdleShell();

  seconds(15);
  seconds(40);
  act(() => grip()?.click());

  expect(sidebarMode()).toBe("rail");

  seconds(14);

  expect(sidebarMode()).toBe("rail");

  seconds(1);

  expect(sidebarMode()).toBe("hidden");
});

test("SHELL-11 with Hide sidebar when idle off the rail never hides", async () => {
  await createSettingsRepo(store).update({ hideSidebarWhenIdle: false });

  await renderIdleShell();

  seconds(120);

  expect(sidebarMode()).toBe("rail");
});

test("SHELL-01 no bar and no Show menu handle are left", async () => {
  await renderShell("Today view");

  expect(screen.queryByRole("navigation", { name: "Views" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Show menu" })).not.toBeInTheDocument();
});

async function goOffline() {
  await putSyncStatus(store, {
    online: false,
    lastSyncedAt: new Date(2026, 9, 9, 9, 32).toISOString(),
    weather: { state: "idle" },
  });
}

test("OFF-01 online there is no offline pill", async () => {
  await renderShell("Today view");

  expect(screen.queryByText("Offline · showing saved data")).not.toBeInTheDocument();
});

test("OFF-01 offline the pill says saved data shows and when it was saved", async () => {
  await goOffline();

  await renderShell("Today view");

  const pill = await screen.findByRole("status");

  expect(pill).toHaveTextContent("Offline · showing saved data");
  expect(pill).toHaveTextContent("Saved 9:32 AM");
});

test("OFF-01 on Weather the pill leaves out the saved time", async () => {
  navigation.pathname = "/weather";

  await goOffline();

  await renderShell("Weather view");

  const pill = await screen.findByRole("status");

  expect(pill).toHaveTextContent("Offline · showing saved data");
  expect(pill).not.toHaveTextContent("Saved");
});

test("OFF-01 on small the pill leaves out the saved time", async () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

  await goOffline();

  await renderShell("Today view");

  expect(await screen.findByRole("status")).not.toHaveTextContent("Saved");
});
