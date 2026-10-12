import { readZoneState, zoneState } from "./zoneState";

const since = new Date(2026, 9, 9, 10, 41, 0);
const secondsIn = (seconds: number) => new Date(since.getTime() + seconds * 1000);
const lastSyncedAt = "2026-10-09T14:30:00.000Z";

const base = { rows: [] as string[], everSynced: false, failed: false, since, now: secondsIn(0) };

describe("zoneState", () => {
  it("LOAD-02 nothing saved and never synced is loading", () => {
    expect(zoneState(base)).toEqual({ kind: "loading" });
  });

  it("LOAD-03 loading still holds just under 10 s", () => {
    expect(zoneState({ ...base, now: secondsIn(9.999) })).toEqual({ kind: "loading" });
  });

  it("LOAD-03 loading for 10 s turns into failure", () => {
    expect(zoneState({ ...base, now: secondsIn(10) })).toEqual({ kind: "failed" });
  });

  it("FAIL-01 a failed first sync with nothing saved is a failure", () => {
    expect(zoneState({ ...base, failed: true })).toEqual({ kind: "failed" });
  });

  it("tech§4.4 synced with no rows is empty", () => {
    expect(zoneState({ ...base, everSynced: true, now: secondsIn(60) })).toEqual({ kind: "empty" });
  });

  it("tech§4.4 saved rows are ready even before any sync", () => {
    expect(zoneState({ ...base, rows: ["a"], now: secondsIn(60) })).toEqual({
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

describe("readZoneState", () => {
  it("LOAD-02 a local read still running is loading", () => {
    expect(readZoneState(undefined)).toEqual({ kind: "loading" });
  });

  it("tech§4.4 a finished read with no rows is empty", () => {
    expect(readZoneState([])).toEqual({ kind: "empty" });
  });

  it("tech§4.4 a finished read with rows is ready", () => {
    expect(readZoneState(["a"])).toEqual({ kind: "ready", data: ["a"] });
  });
});
