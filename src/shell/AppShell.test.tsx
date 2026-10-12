import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type Harness, openHarness, putSyncStatus } from "@/data/repos/testHarness";
import { AppShell } from "./AppShell";
import { NetworkProvider } from "./providers/network";
import { shellWrapper } from "./providers/testShell";

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
  vi.unstubAllGlobals();

  await store.close();
});

async function renderShell(children: ReactNode) {
  const Shell = shellWrapper(store);

  const wrapper = ({ children: shell }: { children: ReactNode }) => (
    <Shell>
      <NetworkProvider pillDelayMs={0}>{shell}</NetworkProvider>
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

test("SHELL-01 shows the view in main above the nav bar", async () => {
  await renderShell("Today view");

  expect(screen.getByRole("main")).toHaveTextContent("Today view");
  expect(screen.getByRole("navigation", { name: "Views" })).toBeInTheDocument();
});

test("SHELL-02 the nav bar marks the route's view", async () => {
  navigation.pathname = "/settings/background";

  await renderShell("Background view");

  expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("aria-current", "page");
});

test("SHELL-01 tapping a view navigates to it", async () => {
  await renderShell("Today view");

  await userEvent.click(screen.getByRole("button", { name: "Notes" }));

  expect(navigation.push).toHaveBeenCalledWith("/notes");
});

test("SHELL-04 changing view resets the main scroll to the top", async () => {
  const { rerender } = await renderShell("Today view");

  const main = screen.getByRole("main");

  trackScroll(main);

  main.scrollTop = 240;

  navigation.pathname = "/calendar";

  rerender(<AppShell>Calendar view</AppShell>);

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
