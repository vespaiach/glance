import { act, fireEvent, render, screen } from "@testing-library/react";
import { createSettingsRepo, type FixtureParams } from "@/data/repos";
import { type Harness, openHarness } from "@/data/repos/testHarness";
import type { AccountSettings } from "@/domain/schemas";
import { FixtureParamsProvider } from "../fixtureOptions";
import { SheetHost, useSheetHost } from "../SheetHost";
import { BarProvider, useBar } from "./bar";
import { IdleProvider } from "./idle";
import { shellWrapper } from "./testShell";

const navigation = vi.hoisted(() => ({
  pathname: "/calendar",
  push: vi.fn<(path: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-bar-provider-test");

  navigation.pathname = "/calendar";
  navigation.push.mockReset();
});

afterEach(async () => {
  vi.useRealTimers();

  await store.close();
});

const tapped = vi.fn();

function BarProbe() {
  const { mode } = useBar();

  const { open } = useSheetHost();

  return (
    <>
      <p>{`bar ${mode}`}</p>
      <button type="button" onClick={() => open({ kind: "newnote" })}>
        open
      </button>
      <button type="button" onClick={tapped}>
        target
      </button>
      <input aria-label="Title" />
    </>
  );
}

type BarOptions = { settings?: Partial<AccountSettings>; params?: FixtureParams };

async function renderBar({ settings = {}, params = {} }: BarOptions = {}) {
  await createSettingsRepo(store).update({ idleTimeout: 60, ...settings });

  vi.useFakeTimers({ now: new Date("2026-10-09T10:41:00"), shouldAdvanceTime: true });

  const Shell = shellWrapper(store);

  const tree = () => (
    <Shell>
      <FixtureParamsProvider params={params}>
        <SheetHost>
          <BarProvider>
            <IdleProvider>
              <BarProbe />
            </IdleProvider>
          </BarProvider>
        </SheetHost>
      </FixtureParamsProvider>
    </Shell>
  );

  const { rerender } = render(tree());

  await screen.findByText(/^bar /);

  await act(async () => {});

  return (pathname: string) => {
    navigation.pathname = pathname;
    rerender(tree());
  };
}

const seconds = (n: number) => act(() => vi.advanceTimersByTime(n * 1000));

const barIs = (text: string) => expect(screen.getByText(/^bar /)).toHaveTextContent(text);

describe("BarProvider", () => {
  beforeEach(() => tapped.mockReset());

  it("SHELL-06 hides the bar after 20 s without a touch", async () => {
    await renderBar();

    barIs("bar docked");

    seconds(19);

    barIs("bar docked");

    seconds(1);

    barIs("bar hidden");
  });

  it("SET-11 with Hide bar when idle off the bar stays docked", async () => {
    await renderBar({ settings: { hideBarWhenIdle: false } });

    seconds(30);

    barIs("bar docked");
  });

  it("SET-11 Off keeps the bar docked even from the hidden fixture", async () => {
    await renderBar({ settings: { hideBarWhenIdle: false }, params: { bar: "hidden" } });

    barIs("bar docked");
  });

  it("SHELL-06 doesn't hide while a sheet is open", async () => {
    await renderBar();

    fireEvent.click(screen.getByRole("button", { name: "open" }));

    seconds(30);

    barIs("bar docked");
  });

  it("SHELL-06 doesn't hide while a text field is focused, and waits 20 s after leaving it", async () => {
    await renderBar();

    act(() => screen.getByRole("textbox", { name: "Title" }).focus());

    seconds(30);

    barIs("bar docked");

    act(() => screen.getByRole("textbox", { name: "Title" }).blur());

    seconds(19);

    barIs("bar docked");

    seconds(1);

    barIs("bar hidden");
  });

  it("SHELL-06 doesn't hide while the on-screen keyboard is up", async () => {
    await renderBar({ params: { kb: true } });

    seconds(30);

    barIs("bar docked");
  });

  it("SHELL-07 a tap reveals the hidden bar floating and still reaches its target", async () => {
    await renderBar({ params: { bar: "hidden" } });

    barIs("bar hidden");

    fireEvent.pointerDown(screen.getByRole("button", { name: "target" }));
    fireEvent.click(screen.getByRole("button", { name: "target" }));

    barIs("bar floating");
    expect(tapped).toHaveBeenCalledOnce();
  });

  it("SHELL-07 the floating bar hides again after 20 s without a touch", async () => {
    await renderBar({ params: { bar: "float" } });

    seconds(20);

    barIs("bar hidden");
  });

  it("SHELL-07 the floating bar docks on the next view change", async () => {
    const goTo = await renderBar({ params: { bar: "float" } });

    goTo("/notes");

    barIs("bar docked");
  });

  it("IDLE-01 the Back to Today timeout lands on Today with the bar hidden", async () => {
    const goTo = await renderBar();

    fireEvent.click(screen.getByRole("button", { name: "open" }));

    seconds(59);

    barIs("bar docked");

    seconds(1);

    expect(navigation.push).toHaveBeenCalledWith("/today");

    goTo("/today");

    barIs("bar hidden");
  });
});
