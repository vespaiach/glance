import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "./AppShell";

const navigation = vi.hoisted(() => ({
  pathname: "/today",
  push: vi.fn<(path: string) => void>(),
  prefetch: vi.fn<(path: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push, prefetch: navigation.prefetch }),
}));

beforeEach(() => {
  navigation.pathname = "/today";
  navigation.push.mockReset();
  navigation.prefetch.mockReset();

  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function trackScroll(element: HTMLElement) {
  let top = 0;

  Object.defineProperty(element, "scrollTop", {
    get: () => top,
    set: (value: number) => {
      top = value;
    },
  });
}

test("SHELL-01 shows the view in main above the nav bar", () => {
  render(<AppShell>Today view</AppShell>);

  expect(screen.getByRole("main")).toHaveTextContent("Today view");
  expect(screen.getByRole("navigation", { name: "Views" })).toBeInTheDocument();
});

test("SHELL-02 the nav bar marks the route's view", () => {
  navigation.pathname = "/settings/background";

  render(<AppShell>Background view</AppShell>);

  expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("aria-current", "page");
});

test("SHELL-01 tapping a view navigates to it", async () => {
  render(<AppShell>Today view</AppShell>);

  await userEvent.click(screen.getByRole("button", { name: "Notes" }));

  expect(navigation.push).toHaveBeenCalledWith("/notes");
});

test("SHELL-04 changing view resets the main scroll to the top", () => {
  const { rerender } = render(<AppShell>Today view</AppShell>);

  const main = screen.getByRole("main");

  trackScroll(main);

  main.scrollTop = 240;

  navigation.pathname = "/calendar";

  rerender(<AppShell>Calendar view</AppShell>);

  expect(main.scrollTop).toBe(0);
});

test("tech§4.5 prefetches the six views on startup", () => {
  render(<AppShell>Today view</AppShell>);

  expect(navigation.prefetch.mock.calls.map(([path]) => path)).toEqual([
    "/today",
    "/calendar",
    "/weather",
    "/notes",
    "/photos",
    "/settings",
  ]);
});
