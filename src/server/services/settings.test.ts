import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { finishLocationStep, putSettings, saveLocation } from "./settings";
import { MARIA, OMAR, serviceHarnessPerTest } from "./testServices";

const harness = serviceHarnessPerTest();

const PORTLAND = { name: "Portland", region: "Oregon", lat: 45.52, lon: -122.68 };

describe("putSettings", () => {
  it("SYNC-01 saves the account's settings stamped with the server time and the next version", async () => {
    expect(await putSettings(harness.deps(), MARIA, MARIA, DEFAULT_SETTINGS)).toEqual({
      ok: true,
      value: {
        ...DEFAULT_SETTINGS,
        accountId: MARIA,
        updatedAt: "2026-10-09T14:00:00.000Z",
        version: 1,
      },
    });
  });

  it("SYNC-03 the later write replaces the whole set", async () => {
    await putSettings(harness.deps(), MARIA, MARIA, {
      ...DEFAULT_SETTINGS,
      weatherLocation: PORTLAND,
    });
    harness.advance(60_000);

    const saved = await putSettings(harness.deps(), MARIA, MARIA, {
      ...DEFAULT_SETTINGS,
      clock: "24h",
    });

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

  it("NOTIF-08 saves the account's lead time, and another account keeps its own", async () => {
    await putSettings(harness.deps(), MARIA, MARIA, { ...DEFAULT_SETTINGS, notifyLead: "off" });
    await putSettings(harness.deps(), OMAR, OMAR, { ...DEFAULT_SETTINGS, notifyLead: 30 });

    expect(await harness.deps().db.settings.get(MARIA)).toMatchObject({ notifyLead: "off" });
    expect(await harness.deps().db.settings.get(OMAR)).toMatchObject({ notifyLead: 30 });
  });

  it("NOTIF-08 refuses to change another account's lead time", async () => {
    await putSettings(harness.deps(), MARIA, MARIA, DEFAULT_SETTINGS);

    expect(
      await putSettings(harness.deps(), OMAR, MARIA, { ...DEFAULT_SETTINGS, notifyLead: "off" }),
    ).toEqual({ ok: false, error: "not-found" });
    expect(await harness.deps().db.settings.get(MARIA)).toMatchObject({ notifyLead: 15 });
  });

  it("tech§5 refuses to write another account's settings", async () => {
    await putSettings(harness.deps(), MARIA, MARIA, DEFAULT_SETTINGS);

    expect(
      await putSettings(harness.deps(), OMAR, MARIA, { ...DEFAULT_SETTINGS, clock: "24h" }),
    ).toEqual({ ok: false, error: "not-found" });
    expect(await harness.globalVersion()).toBe(1);
  });
});

const PDX = { ...PORTLAND, timeZone: "America/Los_Angeles" };

const setupDoneAt = async (accountId: string) =>
  (await harness.deps().db.accounts.byId(accountId))?.setupDoneAt;

describe("saveLocation", () => {
  it("SIGNIN-14 starts from the default settings when the account has none", async () => {
    expect(await saveLocation(harness.deps(), MARIA, PDX)).toEqual({
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

  it("SIGNIN-14 keeps the other saved settings and stamps the next version", async () => {
    await putSettings(harness.deps(), MARIA, MARIA, { ...DEFAULT_SETTINGS, clock: "24h" });

    const saved = await saveLocation(harness.deps(), MARIA, PDX);

    expect(saved).toMatchObject({
      ok: true,
      value: { clock: "24h", weatherLocation: PDX, version: 2 },
    });
  });

  it("tech§5 writes only its own account's settings", async () => {
    await putSettings(harness.deps(), OMAR, OMAR, DEFAULT_SETTINGS);

    await saveLocation(harness.deps(), MARIA, PDX);

    const omar = await harness.deps().db.settings.get(OMAR);

    expect(omar).toEqual({
      ...DEFAULT_SETTINGS,
      accountId: OMAR,
      updatedAt: "2026-10-09T14:00:00.000Z",
      version: 1,
    });
  });
});

describe("finishLocationStep", () => {
  it("SIGNIN-14 a place is saved and ends the first setup", async () => {
    const saved = await finishLocationStep(harness.deps(), MARIA, { place: PDX });

    expect(saved).toMatchObject({ ok: true, value: { weatherLocation: PDX, version: 1 } });
    expect(await setupDoneAt(MARIA)).toBe("2026-10-09T14:00:00.000Z");
  });

  it("SIGNIN-14 a skip ends the first setup and writes nothing else", async () => {
    expect(await finishLocationStep(harness.deps(), MARIA, { skip: true })).toEqual({
      ok: true,
      value: undefined,
    });
    expect(await setupDoneAt(MARIA)).toBe("2026-10-09T14:00:00.000Z");
    expect(await harness.globalVersion()).toBe(0);
  });

  it("tech§5 ends only its own account's setup", async () => {
    await finishLocationStep(harness.deps(), MARIA, { place: PDX });

    expect(await setupDoneAt(OMAR)).toBeNull();
  });
});
