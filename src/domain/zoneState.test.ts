import { loadingTimedOut, zoneState } from "./zoneState";

const since = new Date(2026, 9, 9, 10, 41, 0);
const secondsIn = (seconds: number) => new Date(since.getTime() + seconds * 1000);
const lastSyncedAt = "2026-10-09T14:30:00.000Z";

const base = { rows: [] as string[], everSynced: false, failed: false, timedOut: false };

describe("zoneState", () => {
  it("LOAD-02 nothing saved and never synced is loading", () => {
    expect(zoneState(base)).toEqual({ kind: "loading" });
  });

  it("LOAD-03 loading that timed out is a failure", () => {
    expect(zoneState({ ...base, timedOut: true })).toEqual({ kind: "failed" });
  });

  it("LOAD-02 saved rows stay ready while a later sync is slow", () => {
    expect(zoneState({ ...base, rows: ["a"], everSynced: true, timedOut: true })).toEqual({
      kind: "ready",
      data: ["a"],
    });
  });

  it("FAIL-01 a failed first sync with nothing saved is a failure", () => {
    expect(zoneState({ ...base, failed: true })).toEqual({ kind: "failed" });
  });

  it("tech§4.4 synced with no rows is empty", () => {
    expect(zoneState({ ...base, everSynced: true })).toEqual({ kind: "empty" });
  });

  it("tech§4.4 saved rows are ready even before any sync", () => {
    expect(zoneState({ ...base, rows: ["a"] })).toEqual({
      kind: "ready",
      data: ["a"],
    });
  });

  it("FAIL-02 saved rows after a failed sync are ready with the last sync time", () => {
    expect(
      zoneState({ ...base, rows: ["a"], everSynced: true, failed: true, lastSyncedAt }),
    ).toEqual({ kind: "ready", data: ["a"], updatedAt: lastSyncedAt });
  });

  it("FAIL-02 synced and empty stays empty when a later sync fails", () => {
    expect(zoneState({ ...base, everSynced: true, failed: true, lastSyncedAt })).toEqual({
      kind: "empty",
    });
  });
});

describe("loadingTimedOut", () => {
  it("LOAD-03 still waits just under 10 s", () => {
    expect(loadingTimedOut(since, secondsIn(9.999))).toBe(false);
  });

  it("LOAD-03 times out at 10 s", () => {
    expect(loadingTimedOut(since, secondsIn(10))).toBe(true);
  });
});
