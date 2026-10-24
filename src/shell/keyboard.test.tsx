import { act, renderHook } from "@testing-library/react";
import { useKeyboardInset } from "./keyboard";

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
});
