import { renderHook, waitFor } from "@testing-library/react";
import { useSyncStatus } from "./status";
import { type Harness, openHarness, putSyncStatus, wrapperFor } from "./testHarness";

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
