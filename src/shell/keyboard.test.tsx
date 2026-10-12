import { act, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { FixtureParams } from "@/data/repos";
import { FixtureParamsProvider } from "./fixtureOptions";
import { useFixtureFieldFocus, useKeyboardInset } from "./keyboard";

class FakeViewport extends EventTarget {
  height = 1180;
  offsetTop = 0;

  resize(height: number, offsetTop = 0) {
    this.height = height;
    this.offsetTop = offsetTop;
    this.dispatchEvent(new Event("resize"));
  }
}

let viewport: FakeViewport;

beforeEach(() => {
  viewport = new FakeViewport();

  vi.stubGlobal("innerHeight", 1180);
  vi.stubGlobal("visualViewport", viewport);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function withParams(params: FixtureParams) {
  return ({ children }: { children: ReactNode }) => (
    <FixtureParamsProvider params={params}>{children}</FixtureParamsProvider>
  );
}

describe("useKeyboardInset", () => {
  it("KB-01 is 0 while the visual viewport fills the window", () => {
    const { result } = renderHook(() => useKeyboardInset());

    expect(result.current).toBe(0);
  });

  it("KB-01 follows visualViewport resizes as the keyboard opens and closes", () => {
    const { result } = renderHook(() => useKeyboardInset());

    act(() => viewport.resize(780));

    expect(result.current).toBe(400);

    act(() => viewport.resize(1180));

    expect(result.current).toBe(0);
  });

  it("KB-01 is 0 in a browser with no visualViewport", () => {
    vi.stubGlobal("visualViewport", undefined);

    const { result } = renderHook(() => useKeyboardInset());

    expect(result.current).toBe(0);
  });

  it("KB-01 kb=1 stands in the prototype keyboard height", () => {
    const { result } = renderHook(() => useKeyboardInset(), { wrapper: withParams({ kb: true }) });

    expect(result.current).toBe(380);
  });
});

function Form() {
  useFixtureFieldFocus();

  return (
    <div role="dialog" aria-label="New note">
      <textarea aria-label="Message" defaultValue="Has anyone seen my blue umbr" />
      <input aria-label="Name" />
    </div>
  );
}

describe("useFixtureFieldFocus", () => {
  it("KB-01 kb=1 focuses the first field of the open sheet with the caret at the end", () => {
    vi.useFakeTimers();
    render(<Form />, { wrapper: withParams({ kb: true }) });

    act(() => vi.runAllTimers());

    const message = screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement;

    expect(message).toHaveFocus();
    expect(message.selectionStart).toBe(message.value.length);
  });

  it("KB-01 without kb=1 focuses nothing", () => {
    vi.useFakeTimers();
    render(<Form />, { wrapper: withParams({}) });

    act(() => vi.runAllTimers());

    expect(document.body).toHaveFocus();
  });
});
