import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { accountTimeZone } from "./rows";
import { putSettings } from "./settings";
import { MARIA, OMAR, serviceHarnessPerTest } from "./testServices";

const harness = serviceHarnessPerTest();

const PORTLAND = { name: "Portland", region: "Oregon", lat: 45.52, lon: -122.68 };

function locate(accountId: string, weatherLocation: typeof PORTLAND & { timeZone?: string }) {
  putSettings(harness.deps(), accountId, accountId, { ...DEFAULT_SETTINGS, weatherLocation });
}

describe("accountTimeZone", () => {
  it("LOC-07 uses the location's time zone", () => {
    locate(MARIA, { ...PORTLAND, timeZone: "America/Los_Angeles" });

    expect(accountTimeZone(harness.deps().db, MARIA)).toBe("America/Los_Angeles");
  });

  it("LOC-07 falls back to the account's zone with no settings or a place without a zone", () => {
    locate(MARIA, PORTLAND);

    expect(accountTimeZone(harness.deps().db, MARIA)).toBe("America/New_York");
    expect(accountTimeZone(harness.deps().db, OMAR)).toBe("America/New_York");
  });

  it("tech§5 never reads another account's location", () => {
    locate(OMAR, { ...PORTLAND, timeZone: "America/Los_Angeles" });

    expect(accountTimeZone(harness.deps().db, MARIA)).toBe("America/New_York");
  });
});
