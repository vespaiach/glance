import { INITIAL_STATUS, nextStatus, type SyncStatus } from "./status";

const AT = "2026-10-09T17:41:00.000Z";

const RETRY_AT = "2026-10-09T17:42:00.000Z";

const SYNCED: SyncStatus = { online: true, lastSyncedAt: AT, weather: { state: "idle" } };

describe("nextStatus", () => {
  it("tech§4.6 starts online with idle weather and no sync yet", () => {
    expect(INITIAL_STATUS).toEqual({ online: true, weather: { state: "idle" } });
  });

  it("tech§4.6 a sync marks the screen online, records the time and clears the error", () => {
    const failed: SyncStatus = { ...INITIAL_STATUS, online: false, error: "server" };

    expect(nextStatus(failed, { type: "synced", at: AT })).toEqual(SYNCED);
  });

  it("OFF-01 a network failure marks the screen offline and keeps the last sync time", () => {
    expect(nextStatus(SYNCED, { type: "failed", error: "network" })).toEqual({
      ...SYNCED,
      online: false,
    });
  });

  it.each(["unauthorized", "outdated", "server"] as const)(
    "tech§4.6 a %s failure is recorded as the error while online",
    (error) => {
      expect(nextStatus({ ...SYNCED, online: false }, { type: "failed", error })).toEqual({
        ...SYNCED,
        error,
      });
    },
  );

  it("WX-05 weather goes loading, then failed with its retry time, then idle", () => {
    const loading = nextStatus(SYNCED, { type: "weather-loading" });

    const failed = nextStatus(loading, { type: "weather-failed", retryAt: RETRY_AT });

    expect(loading.weather).toEqual({ state: "loading" });
    expect(failed.weather).toEqual({ state: "failed", retryAt: RETRY_AT });
    expect(nextStatus(failed, { type: "weather-loaded" }).weather).toEqual({ state: "idle" });
  });
});
