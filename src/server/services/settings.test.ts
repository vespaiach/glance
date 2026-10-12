import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { putSettings } from "./settings";
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
