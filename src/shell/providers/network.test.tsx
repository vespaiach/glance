import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { type Harness, openHarness, putSyncStatus } from "@/data/repos/testHarness";
import { NetworkProvider, useNetwork } from "./network";
import { shellWrapper } from "./testShell";

const START = new Date("2026-10-09T10:41:00");

const SAVED_AT = "2026-10-09T17:30:00.000Z";

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-network-provider-test");

  vi.useFakeTimers({ now: START, shouldAdvanceTime: true });
});

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();

  await store.close();
});

function setBrowserOnline(online: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);

  window.dispatchEvent(new Event(online ? "online" : "offline"));
}

function renderNetwork(pillDelayMs?: number) {
  const Shell = shellWrapper(store);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <NetworkProvider pillDelayMs={pillDelayMs}>{children}</NetworkProvider>
    </Shell>
  );

  return renderHook(() => useNetwork(), { wrapper });
}

const offlineStatus = {
  online: false,
  lastSyncedAt: SAVED_AT,
  weather: { state: "idle" as const },
};

describe("NetworkProvider", () => {
  it("OFF-01 is online with no pill while syncs succeed", async () => {
    const { result } = renderNetwork();

    await waitFor(() => expect(result.current).toEqual({ online: true, showOfflinePill: false }));
  });

  it("OFF-01 shows the pill only after 30 s offline, with the saved time", async () => {
    const { result } = renderNetwork();

    await waitFor(() => expect(result.current.online).toBe(true));

    await act(() => putSyncStatus(store, offlineStatus));

    await waitFor(() => expect(result.current.online).toBe(false));
    expect(result.current).toEqual({ online: false, showOfflinePill: false, savedAt: SAVED_AT });

    act(() => vi.advanceTimersByTime(28_000));

    expect(result.current.showOfflinePill).toBe(false);

    act(() => vi.advanceTimersByTime(2_000));

    expect(result.current.showOfflinePill).toBe(true);
  });

  it("OFF-01 the browser going offline counts as offline", async () => {
    const { result } = renderNetwork();

    await waitFor(() => expect(result.current.online).toBe(true));

    act(() => setBrowserOnline(false));

    expect(result.current.online).toBe(false);

    act(() => vi.advanceTimersByTime(30_000));

    expect(result.current.showOfflinePill).toBe(true);

    act(() => setBrowserOnline(true));

    expect(result.current).toEqual({ online: true, showOfflinePill: false });
  });

  it("OFF-01 the pill leaves on reconnect and waits 30 s again next time", async () => {
    await putSyncStatus(store, offlineStatus);

    const { result } = renderNetwork();

    await waitFor(() => expect(result.current.online).toBe(false));

    act(() => vi.advanceTimersByTime(30_000));

    expect(result.current.showOfflinePill).toBe(true);

    await act(() => putSyncStatus(store, { ...offlineStatus, online: true }));

    await waitFor(() => expect(result.current.showOfflinePill).toBe(false));

    await act(() => putSyncStatus(store, offlineStatus));

    await waitFor(() => expect(result.current.online).toBe(false));
    expect(result.current.showOfflinePill).toBe(false);
  });

  it("OFF-01 a fixture can show the pill at once", async () => {
    await putSyncStatus(store, offlineStatus);

    const { result } = renderNetwork(0);

    await waitFor(() => expect(result.current.showOfflinePill).toBe(true));
  });
});
