import { renderHook, waitFor } from "@testing-library/react";
import { useRetry, useSourceStatus, useSyncStatus } from "./status";
import {
  type Harness,
  markSynced,
  openHarness,
  putSyncStatus,
  TEST_NOW,
  wrapperFor,
} from "./testHarness";

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-status-repo-test");
});

afterEach(() => store.close());

describe("useSyncStatus", () => {
  it("tech§4.6 reads online with no status written yet", async () => {
    const { result } = renderHook(() => useSyncStatus(), { wrapper: wrapperFor(store) });

    await waitFor(() =>
      expect(result.current).toEqual({ online: true, weather: { state: "idle" } }),
    );
  });

  it("tech§4.6 follows the status the sync engine writes to meta", async () => {
    const { result } = renderHook(() => useSyncStatus(), { wrapper: wrapperFor(store) });

    const status = {
      online: false,
      lastSyncedAt: "2026-10-09T17:30:00.000Z",
      weather: { state: "idle" as const },
    };

    await putSyncStatus(store, status);

    await waitFor(() => expect(result.current).toEqual(status));
  });
});

describe("useSourceStatus", () => {
  const LAST_SYNC = "2026-10-09T17:30:00.000Z";

  const RETRY_AT = "2026-10-09T17:42:00.000Z";

  it("LOAD-02 before the first sync the sources are waiting since the screen started", async () => {
    const { result } = renderHook(() => useSourceStatus(), { wrapper: wrapperFor(store) });

    await waitFor(() =>
      expect(result.current).toEqual({
        everSynced: false,
        failed: false,
        since: TEST_NOW,
        weather: { state: "idle" },
      }),
    );
  });

  it("tech§4.4 a saved pull cursor marks the sources ever synced", async () => {
    await markSynced(store);

    const { result } = renderHook(() => useSourceStatus(), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current?.everSynced).toBe(true));
  });

  it.each([
    ["a server error", { online: true, error: "server" as const }],
    ["a network error", { online: false }],
  ])("FAIL-01 %s fails the sources with the last sync and retry times", async (_, failure) => {
    await putSyncStatus(store, {
      ...failure,
      lastSyncedAt: LAST_SYNC,
      retryAt: RETRY_AT,
      weather: { state: "idle" },
    });

    const { result } = renderHook(() => useSourceStatus(), { wrapper: wrapperFor(store) });

    await waitFor(() =>
      expect(result.current).toMatchObject({
        failed: true,
        lastSyncedAt: LAST_SYNC,
        retryAt: RETRY_AT,
      }),
    );
  });
});

describe("useRetry", () => {
  it("FAIL-01 Try again syncs now or refreshes the weather", () => {
    const { result } = renderHook(() => useRetry(), { wrapper: wrapperFor(store) });

    result.current.sync();
    result.current.weather();

    expect(store.nudge).toHaveBeenCalledTimes(1);
    expect(store.refreshWeather).toHaveBeenCalledTimes(1);
  });
});
