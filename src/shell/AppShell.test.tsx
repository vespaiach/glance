import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type Harness, openHarness } from "@/data/repos/testHarness";
import { AppShell } from "./AppShell";
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
  const view = render(<AppShell>{children}</AppShell>, { wrapper: shellWrapper(store) });

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
