import { act, fireEvent, render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { NowProvider, useNow } from "./now";

const START = new Date("2026-10-09T10:41:58");

function wrapper({ children }: { children: ReactNode }) {
  return <NowProvider>{children}</NowProvider>;
}

function frozenWrapper({ children }: { children: ReactNode }) {
  return <NowProvider frozenAt={START}>{children}</NowProvider>;
}

beforeEach(() => {
  vi.useFakeTimers({ now: START });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("NowProvider", () => {
  it("TIME-02 ticks every second", () => {
    const { result } = renderHook(() => useNow(), { wrapper });

    expect(result.current).toEqual(START);

    act(() => vi.advanceTimersByTime(1000));

    expect(result.current).toEqual(new Date("2026-10-09T10:41:59"));
  });

  it("TIME-02 minute subscribers re-render once a minute", () => {
    let renders = 0;

    const { result } = renderHook(
      () => {
        renders += 1;

        return useNow("minute");
      },
      { wrapper },
    );

    act(() => vi.advanceTimersByTime(1000));

    expect(renders).toBe(1);

    act(() => vi.advanceTimersByTime(1000));

    expect(renders).toBe(2);
    expect(result.current).toEqual(new Date("2026-10-09T10:42:00"));

    act(() => vi.advanceTimersByTime(59_000));

    expect(renders).toBe(2);
  });

  it("TIME-02 day subscribers re-render at midnight", () => {
    vi.setSystemTime(new Date("2026-10-09T23:59:58"));

    let renders = 0;

    const { result } = renderHook(
      () => {
        renders += 1;

        return useNow("day");
      },
      { wrapper },
    );

    act(() => vi.advanceTimersByTime(1000));

    expect(renders).toBe(1);

    act(() => vi.advanceTimersByTime(1000));

    expect(renders).toBe(2);
    expect(result.current).toEqual(new Date("2026-10-10T00:00:00"));
  });

  it("TIME-03 a frozen now stays put until the first tap", () => {
    vi.setSystemTime(new Date("2030-01-01T08:00:00"));

    const { result } = renderHook(() => useNow(), { wrapper: frozenWrapper });

    act(() => vi.advanceTimersByTime(5000));

    expect(result.current).toEqual(START);

    act(() => {
      fireEvent.pointerDown(document.body);
    });

    act(() => vi.advanceTimersByTime(2000));

    expect(result.current).toEqual(new Date("2026-10-09T10:42:00"));
  });

  it("TIME-03 every reader sees the same now", () => {
    const { container } = render(
      <NowProvider frozenAt={new Date("2026-10-09T10:41:00")}>
        <Both />
      </NowProvider>,
    );

    expect(container).toHaveTextContent("0");
  });
});

function Both() {
  const a = useNow();
  const b = useNow("minute");

  return <output>{`${a.getTime() - b.getTime()}`}</output>;
}
