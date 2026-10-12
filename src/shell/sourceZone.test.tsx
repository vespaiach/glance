import { act, renderHook, waitFor } from "@testing-library/react";
import {
  type Harness,
  markSynced,
  openHarness,
  putSyncStatus,
  TEST_NOW,
} from "@/data/repos/testHarness";
import type { Weather } from "@/domain/schemas";
import { shellWrapper } from "./providers/testShell";
import { useSyncedZone, useWeatherZone } from "./sourceZone";

const MINUTE = 60_000;

const LAST_SYNC = "2026-10-09T17:30:00.000Z";

const inMinutes = (minutes: number) =>
  new Date(TEST_NOW.getTime() + minutes * MINUTE).toISOString();

const FORECAST = { location: "Portland, OR", fetchedAt: LAST_SYNC } as Weather;

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-source-zone-test");

  vi.useFakeTimers({ now: TEST_NOW, shouldAdvanceTime: true });
});

afterEach(async () => {
  vi.useRealTimers();

  await store.close();
});

function renderSynced(rows: readonly string[] | undefined) {
  return renderHook(() => useSyncedZone(rows), { wrapper: shellWrapper(store) });
}

function renderWeather(weather: Weather | null | undefined, located = true) {
  return renderHook(() => useWeatherZone(weather, located), { wrapper: shellWrapper(store) });
}

describe("useSyncedZone", () => {
  it("LOAD-02 nothing saved before the first sync is loading", async () => {
    const { result } = renderSynced([]);

    await act(() => vi.advanceTimersByTimeAsync(9_000));

    expect(result.current.state).toEqual({ kind: "loading" });
  });

  it("LOAD-02 a local read still running is loading", async () => {
    await markSynced(store);

    const { result } = renderSynced(undefined);

    await act(() => vi.advanceTimersByTimeAsync(20_000));

    expect(result.current.state).toEqual({ kind: "loading" });
  });

  it("LOAD-03 loading for 10 s turns into the failure state", async () => {
    const { result } = renderSynced([]);

    await act(() => vi.advanceTimersByTimeAsync(10_000));

    await waitFor(() => expect(result.current.state).toEqual({ kind: "failed" }));
  });

  it("LOAD-01 rows saved before any sync are ready", async () => {
    const { result } = renderSynced(["a"]);

    await waitFor(() => expect(result.current.state).toEqual({ kind: "ready", data: ["a"] }));
  });

  it("tech§4.4 a synced source with no rows is empty", async () => {
    await markSynced(store);

    const { result } = renderSynced([]);

    await waitFor(() => expect(result.current.state).toEqual({ kind: "empty" }));
  });

  it("FAIL-01 a failed first sync counts down to its retry and Try again syncs", async () => {
    await putSyncStatus(store, {
      online: true,
      error: "server",
      retryAt: inMinutes(2),
      weather: { state: "idle" },
    });

    const { result } = renderSynced([]);

    await waitFor(() => expect(result.current.state).toEqual({ kind: "failed" }));
    expect(result.current.retryIn).toBe(2);

    result.current.retry();

    expect(store.nudge).toHaveBeenCalledTimes(1);
  });

  it("FAIL-02 saved rows after a failed sync show the last sync time", async () => {
    await markSynced(store);

    await putSyncStatus(store, {
      online: true,
      error: "server",
      lastSyncedAt: LAST_SYNC,
      weather: { state: "idle" },
    });

    const { result } = renderSynced(["a"]);

    await waitFor(() =>
      expect(result.current.state).toEqual({ kind: "ready", data: ["a"], updatedAt: LAST_SYNC }),
    );
  });
});

describe("useWeatherZone", () => {
  it("WX-05 a fetch loading for 10 s turns into the failure state", async () => {
    await markSynced(store);

    await putSyncStatus(store, {
      online: true,
      weather: { state: "loading", since: TEST_NOW.toISOString() },
    });

    const { result } = renderWeather(null);

    await waitFor(() => expect(result.current.state).toEqual({ kind: "loading" }));

    await act(() => vi.advanceTimersByTimeAsync(10_000));

    await waitFor(() => expect(result.current.state).toEqual({ kind: "failed" }));
  });

  it("LOAD-03 after the first sync, weather waits only on its own fetch", async () => {
    await markSynced(store);

    const { result } = renderWeather(null);

    await act(() => vi.advanceTimersByTimeAsync(20_000));

    expect(result.current.state).toEqual({ kind: "loading" });
  });

  it("WX-05 a failed fetch counts down to its retry and Try again refreshes", async () => {
    await putSyncStatus(store, {
      online: true,
      weather: { state: "failed", retryAt: inMinutes(5) },
    });

    const { result } = renderWeather(null);

    await waitFor(() => expect(result.current.state).toEqual({ kind: "failed" }));
    expect(result.current.retryIn).toBe(5);

    result.current.retry();

    expect(store.refreshWeather).toHaveBeenCalledTimes(1);
  });

  it("FAIL-02 a saved forecast after a failed fetch shows its fetch time", async () => {
    await putSyncStatus(store, {
      online: true,
      weather: { state: "failed", retryAt: inMinutes(1) },
    });

    const { result } = renderWeather(FORECAST);

    await waitFor(() =>
      expect(result.current.state).toEqual({
        kind: "ready",
        data: [FORECAST],
        updatedAt: LAST_SYNC,
      }),
    );
  });

  it("LOAD-02 before the first sync a missing location is still loading", async () => {
    const { result } = renderWeather(null, false);

    await act(() => vi.advanceTimersByTimeAsync(1_000));

    expect(result.current.state).toEqual({ kind: "loading" });
  });

  it("WX-04 no location after a sync is empty", async () => {
    await markSynced(store);

    const { result } = renderWeather(null, false);

    await waitFor(() => expect(result.current.state).toEqual({ kind: "empty" }));
  });
});
