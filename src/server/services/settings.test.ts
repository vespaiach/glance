import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { finishLocationStep, putSettings, saveLocation } from "./settings";
import { MARIA, OMAR, serviceHarnessPerTest } from "./testServices";

const harness = serviceHarnessPerTest();

const PORTLAND = { name: "Portland", region: "Oregon", lat: 45.52, lon: -122.68 };

describe("putSettings", () => {
  it("SYNC-01 saves the account's settings stamped with the server time and the next version", () => {
    expect(putSettings(harness.deps(), MARIA, MARIA, DEFAULT_SETTINGS)).toEqual({
      ok: true,
      value: {
        ...DEFAULT_SETTINGS,
        accountId: MARIA,
        updatedAt: "2026-10-09T14:00:00.000Z",
        version: 1,
      },
    });
  });

  it("SYNC-03 the later write replaces the whole set", () => {
    putSettings(harness.deps(), MARIA, MARIA, { ...DEFAULT_SETTINGS, weatherLocation: PORTLAND });
    harness.advance(60_000);

    const saved = putSettings(harness.deps(), MARIA, MARIA, { ...DEFAULT_SETTINGS, clock: "24h" });

    expect(saved).toEqual({
      ok: true,
      value: {
        ...DEFAULT_SETTINGS,
        clock: "24h",
        accountId: MARIA,
        updatedAt: "2026-10-09T14:01:00.000Z",
        version: 2,
      },
    });
  });

  it("tech§5 refuses to write another account's settings", () => {
    putSettings(harness.deps(), MARIA, MARIA, DEFAULT_SETTINGS);

    expect(putSettings(harness.deps(), OMAR, MARIA, { ...DEFAULT_SETTINGS, clock: "24h" })).toEqual(
      { ok: false, error: "not-found" },
    );
    expect(harness.globalVersion()).toBe(1);
  });
});

const PDX = { ...PORTLAND, timeZone: "America/Los_Angeles" };

const setupDoneAt = (accountId: string) =>
  (
    harness.deps().db.prepare("SELECT setup_done_at FROM accounts WHERE id = ?").get(accountId) as {
      setup_done_at: string | null;
    }
  ).setup_done_at;

describe("saveLocation", () => {
  it("SIGNIN-14 starts from the default settings when the account has none", () => {
    expect(saveLocation(harness.deps(), MARIA, PDX)).toEqual({
      ok: true,
      value: {
        ...DEFAULT_SETTINGS,
        weatherLocation: PDX,
        accountId: MARIA,
        updatedAt: "2026-10-09T14:00:00.000Z",
        version: 1,
      },
    });
  });

  it("SIGNIN-14 keeps the other saved settings and stamps the next version", () => {
    putSettings(harness.deps(), MARIA, MARIA, { ...DEFAULT_SETTINGS, clock: "24h" });

    const saved = saveLocation(harness.deps(), MARIA, PDX);

    expect(saved).toMatchObject({
      ok: true,
      value: { clock: "24h", weatherLocation: PDX, version: 2 },
    });
  });

  it("tech§5 writes only its own account's settings", () => {
    putSettings(harness.deps(), OMAR, OMAR, DEFAULT_SETTINGS);

    saveLocation(harness.deps(), MARIA, PDX);

    const omar = harness
      .deps()
      .db.prepare("SELECT json FROM settings WHERE account_id = ?")
      .get(OMAR);

    expect(omar).toEqual({ json: JSON.stringify(DEFAULT_SETTINGS) });
  });
});

describe("finishLocationStep", () => {
  it("SIGNIN-14 a place is saved and ends the first setup", () => {
    const saved = finishLocationStep(harness.deps(), MARIA, { place: PDX });

    expect(saved).toMatchObject({ ok: true, value: { weatherLocation: PDX, version: 1 } });
    expect(setupDoneAt(MARIA)).toBe("2026-10-09T14:00:00.000Z");
  });

  it("SIGNIN-14 a skip ends the first setup and writes nothing else", () => {
    expect(finishLocationStep(harness.deps(), MARIA, { skip: true })).toEqual({
      ok: true,
      value: undefined,
    });
    expect(setupDoneAt(MARIA)).toBe("2026-10-09T14:00:00.000Z");
    expect(harness.globalVersion()).toBe(0);
  });

  it("tech§5 ends only its own account's setup", () => {
    finishLocationStep(harness.deps(), MARIA, { place: PDX });

    expect(setupDoneAt(OMAR)).toBeNull();
  });
});
