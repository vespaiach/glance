import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { SheetHost, useSheetHost } from "./SheetHost";

const navigation = vi.hoisted(() => ({ pathname: "/today" }));

vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

function wrapper({ children }: { children: ReactNode }) {
  return <SheetHost>{children}</SheetHost>;
}

beforeEach(() => {
  navigation.pathname = "/today";
});

describe("SheetHost", () => {
  it("tech§4.3 holds one open sheet at a time", () => {
    const { result } = renderHook(() => useSheetHost(), { wrapper });

    expect(result.current.sheet).toBeNull();

    act(() => result.current.open({ kind: "note", id: "n1" }));

    expect(result.current.sheet).toEqual({ kind: "note", id: "n1" });

    act(() => result.current.open({ kind: "newnote" }));

    expect(result.current.sheet).toEqual({ kind: "newnote" });

    act(() => result.current.close());

    expect(result.current.sheet).toBeNull();
  });

  it("SHELL-04 changing view closes the open sheet", () => {
    const { result, rerender } = renderHook(() => useSheetHost(), { wrapper });

    act(() => result.current.open({ kind: "newevent", day: "2026-10-09" }));

    navigation.pathname = "/calendar";

    rerender();

    expect(result.current.sheet).toBeNull();
  });
});
