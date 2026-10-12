import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { deviceTimeZone } from "@/domain/zone";
import { NowProvider, useNow } from "./now";
import { DefaultSettingsProvider } from "./settings";
import { TimeZoneProvider, useTimeZone } from "./timeZone";

const LA = "America/Los_Angeles";

const PORTLAND = { name: "Portland", region: "Oregon", lat: 45.5152, lon: -122.6784 };

function located(weatherLocation?: typeof PORTLAND & { timeZone?: string }) {
  return ({ children }: { children: ReactNode }) => (
    <DefaultSettingsProvider overrides={weatherLocation && { weatherLocation }}>
      <TimeZoneProvider>{children}</TimeZoneProvider>
    </DefaultSettingsProvider>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("TimeZoneProvider", () => {
  it("LOC-06 useTimeZone is the device zone without a provider", () => {
    const { result } = renderHook(() => useTimeZone());

    expect(result.current).toBe(deviceTimeZone());
  });

  it("LOC-06 the provider gives the location's zone", () => {
    const { result } = renderHook(() => useTimeZone(), {
      wrapper: located({ ...PORTLAND, timeZone: LA }),
    });

    expect(result.current).toBe(LA);
  });

  it("LOC-06 the provider gives the device zone when no place is set", () => {
    const { result } = renderHook(() => useTimeZone(), { wrapper: located() });

    expect(result.current).toBe(deviceTimeZone());
  });

  it("LOC-06 the provider gives the device zone when the place has no zone", () => {
    const { result } = renderHook(() => useTimeZone(), { wrapper: located(PORTLAND) });

    expect(result.current).toBe(deviceTimeZone());
  });

  it("LOC-06 day subscribers re-render at midnight in the screen's zone", () => {
    vi.useFakeTimers({ now: new Date("2026-10-10T06:59:58Z") });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <NowProvider>
        <DefaultSettingsProvider>
          <TimeZoneProvider timeZone={LA}>{children}</TimeZoneProvider>
        </DefaultSettingsProvider>
      </NowProvider>
    );

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
    expect(result.current.toISOString()).toBe("2026-10-10T07:00:00.000Z");
  });
});
