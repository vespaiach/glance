import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useWhoFilter, WhoFilterProvider } from "./whoFilter";

function provider(initial?: string[]) {
  return ({ children }: { children: ReactNode }) => (
    <WhoFilterProvider initial={initial}>{children}</WhoFilterProvider>
  );
}

describe("WhoFilterProvider", () => {
  it("CAL-05 starts with every tag selected", () => {
    const { result } = renderHook(() => useWhoFilter(), { wrapper: provider() });

    expect(result.current.filter).toBe("all");
  });

  it("CAL-05 who= sets the starting filter, and who=none is nobody", () => {
    const some = renderHook(() => useWhoFilter(), { wrapper: provider(["mom"]) });
    const none = renderHook(() => useWhoFilter(), { wrapper: provider([]) });

    expect(some.result.current.filter).toEqual(new Set(["mom"]));
    expect(none.result.current.filter).toEqual(new Set());
  });

  it("CAL-05 Today and Calendar read the same filter", () => {
    const { result } = renderHook(() => ({ today: useWhoFilter(), calendar: useWhoFilter() }), {
      wrapper: provider(),
    });

    act(() => result.current.today.setFilter(new Set(["dad"])));

    expect(result.current.calendar.filter).toEqual(new Set(["dad"]));
  });
});
