import { act, renderHook } from "@testing-library/react";
import { useBreakpoint, useViewportWidth } from "./breakpoint";

let width = 1920;

const listeners = new Set<() => void>();

function minWidth(query: string): number {
  return Number(/min-width:\s*(\d+)px/.exec(query)?.[1]);
}

function resizeTo(next: number) {
  width = next;

  for (const listener of listeners) listener();
}

beforeEach(() => {
  width = 1920;
  listeners.clear();

  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return width >= minWidth(query);
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useBreakpoint", () => {
  it("spec§5.1 follows the window width live", () => {
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current).toBe("wide");

    act(() => resizeTo(1180));

    expect(result.current).toBe("mid");

    act(() => resizeTo(820));

    expect(result.current).toBe("narrow");

    act(() => resizeTo(390));

    expect(result.current).toBe("phone");
  });
});

describe("useViewportWidth", () => {
  it("spec§5.4 follows the window width live", () => {
    vi.stubGlobal("innerWidth", 820);

    const { result } = renderHook(() => useViewportWidth());

    expect(result.current).toBe(820);

    act(() => {
      vi.stubGlobal("innerWidth", 390);
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe(390);
  });
});
