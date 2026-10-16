import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createSettingsRepo, type FixtureParams } from "@/data/repos";
import { type Harness, openHarness, putSyncStatus } from "@/data/repos/testHarness";
import { AppShell } from "./AppShell";
import { FixtureParamsProvider } from "./fixtureOptions";
import { IdleProvider } from "./providers/idle";
import { NetworkProvider } from "./providers/network";
import { shellWrapper } from "./providers/testShell";
import { SheetHost } from "./SheetHost";

const navigation = vi.hoisted(() => ({
  pathname: "/today",
  push: vi.fn<(path: string) => void>(),
  prefetch: vi.fn<(path: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push, prefetch: navigation.prefetch }),
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

async function renderShell(children: ReactNode, params: FixtureParams = {}) {
  const Shell = shellWrapper(store);

  const wrapper = ({ children: shell }: { children: ReactNode }) => (
    <Shell>
      <FixtureParamsProvider params={params}>
        <SheetHost>
          <IdleProvider>
            <NetworkProvider pillDelayMs={0}>{shell}</NetworkProvider>
          </IdleProvider>
        </SheetHost>
      </FixtureParamsProvider>
    </Shell>
  );

  const view = render(<AppShell>{children}</AppShell>, { wrapper });

  await screen.findByRole("main");

  return view;
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
  return screen.getByRole("button", { name: "Open menu" }).closest("nav") as HTMLElement;
}

function drawer() {
  return screen.getByRole("button", { name: "Close sidebar" }).closest("nav") as HTMLElement;
}

function grip() {
  return screen.queryByRole("button", { name: "Show sidebar" });
}

function sidebarMode() {
  if (!rail().hasAttribute("inert")) return drawer().hasAttribute("inert") ? "rail" : "expanded";

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

test("SHELL-08 rail=1 starts on Rail and rail=open starts Expanded", async () => {
  const { unmount } = await renderShell("Today view", { rail: "1" });

  expect(sidebarMode()).toBe("rail");

  unmount();

  await renderShell("Today view", { rail: "open" });

  expect(sidebarMode()).toBe("expanded");
});

test("SHELL-02 the rail marks the route's view", async () => {
  navigation.pathname = "/settings/background";

  await renderShell("Background view", { rail: "1" });

  expect(within(rail()).getByRole("button", { name: "Settings" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("SHELL-01 tapping a view on the rail navigates to it", async () => {
  await renderShell("Today view", { rail: "1" });

  await userEvent.click(within(rail()).getByRole("button", { name: "Notes" }));

  expect(navigation.push).toHaveBeenCalledWith("/notes");
});

test("SHELL-08 the grip shows the rail, Open menu expands it and ✕ hides it", async () => {
  await renderShell("Today view");

  await userEvent.click(screen.getByRole("button", { name: "Show sidebar" }));

  expect(sidebarMode()).toBe("rail");

  await userEvent.click(screen.getByRole("button", { name: "Open menu" }));

  expect(sidebarMode()).toBe("expanded");

  await userEvent.click(screen.getByRole("button", { name: "Close sidebar" }));

  expect(sidebarMode()).toBe("hidden");
});

test("SHELL-08 a view change from Expanded lands on Rail", async () => {
  const { rerender } = await renderShell("Today view", { rail: "open" });

  changeView(rerender, "/calendar");

  expect(sidebarMode()).toBe("rail");
});

test("SHELL-08 picking a drawer row goes to that view and returns to Rail", async () => {
  await renderShell("Today view", { rail: "open" });

  await userEvent.click(within(drawer()).getByRole("button", { name: "Weather" }));

  expect(navigation.push).toHaveBeenCalledWith("/weather");
  expect(sidebarMode()).toBe("rail");
});

test("SHELL-09 opening the drawer moves focus to the current view's row", async () => {
  navigation.pathname = "/photos";

  await renderShell("Photos view", { rail: "1" });

  await userEvent.click(screen.getByRole("button", { name: "Open menu" }));

  expect(within(drawer()).getByRole("button", { name: "Photos" })).toHaveFocus();
});

test("SHELL-09 Escape returns to Rail and focuses Open menu", async () => {
  await renderShell("Today view", { rail: "1" });

  await userEvent.click(screen.getByRole("button", { name: "Open menu" }));

  await userEvent.keyboard("{Escape}");

  expect(sidebarMode()).toBe("rail");
  expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
});

test("SHELL-09 Escape does nothing on Rail", async () => {
  await renderShell("Today view", { rail: "1" });

  await userEvent.keyboard("{Escape}");

  expect(sidebarMode()).toBe("rail");
});

test("SHELL-09 ✕ moves focus to the grip", async () => {
  await renderShell("Today view", { rail: "open" });

  await userEvent.click(screen.getByRole("button", { name: "Close sidebar" }));

  expect(screen.getByRole("button", { name: "Show sidebar" })).toHaveFocus();
});

test("SHELL-09 the grip's tap moves focus to Open menu", async () => {
  await renderShell("Today view");

  await userEvent.click(screen.getByRole("button", { name: "Show sidebar" }));

  expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
});

test("SHELL-09 loading the page moves no focus", async () => {
  await renderShell("Today view", { rail: "open" });

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

  expect(navigation.prefetch.mock.calls.map(([path]) => path)).toEqual([
    "/today",
    "/calendar",
    "/weather",
    "/notes",
    "/photos",
    "/settings",
  ]);
});

async function idleBackToToday(params: FixtureParams) {
  await createSettingsRepo(store).update({ idleTimeout: 60 });

  vi.useFakeTimers({ now: new Date("2026-10-09T10:41:00"), shouldAdvanceTime: true });

  navigation.pathname = "/calendar";

  const { rerender } = await renderShell("/calendar view", params);

  act(() => vi.advanceTimersByTime(60_000));

  expect(navigation.push).toHaveBeenCalledWith("/today");

  changeView(rerender, "/today");
}

test("IDLE-01 the idle return to Today closes the drawer to Rail", async () => {
  await idleBackToToday({ rail: "open" });

  expect(sidebarMode()).toBe("rail");
});

test("IDLE-01 the idle return to Today keeps a Hidden sidebar hidden", async () => {
  await idleBackToToday({});

  expect(sidebarMode()).toBe("hidden");
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

test("OFF-01 on a phone the pill leaves out the saved time", async () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

  await goOffline();

  await renderShell("Today view");

  expect(await screen.findByRole("status")).not.toHaveTextContent("Saved");
});
