import { asksZoneChange, timeZoneName, zoneChange } from "./zoneName";

const OCT_9 = new Date("2026-10-09T17:41:00Z");

const JAN_9 = new Date("2026-01-09T18:41:00Z");

describe("timeZoneName", () => {
  it.each([
    ["America/New_York", "Eastern time"],
    ["America/Detroit", "Eastern time"],
    ["America/Indiana/Indianapolis", "Eastern time"],
    ["America/Kentucky/Louisville", "Eastern time"],
    ["America/Chicago", "Central time"],
    ["America/Indiana/Knox", "Central time"],
    ["America/North_Dakota/Center", "Central time"],
    ["America/Denver", "Mountain time"],
    ["America/Boise", "Mountain time"],
    ["America/Phoenix", "Arizona time"],
    ["America/Los_Angeles", "Pacific time"],
    ["America/Anchorage", "Alaska time"],
    ["America/Juneau", "Alaska time"],
    ["Pacific/Honolulu", "Hawaii time"],
    ["America/Puerto_Rico", "Atlantic time"],
    ["America/St_Thomas", "Atlantic time"],
    ["Pacific/Guam", "Chamorro time"],
    ["Pacific/Saipan", "Chamorro time"],
    ["Pacific/Pago_Pago", "Samoa time"],
  ])("LOC-08 names %s %s", (zone, name) => {
    expect(timeZoneName(zone)).toBe(name);
  });

  it("LOC-08 a zone outside the table reads its long generic name with a lowercase time", () => {
    expect(timeZoneName("Europe/Paris")).toBe("Central European time");
  });
});

describe("zoneChange", () => {
  it("LOC-09 Pacific to Eastern moves the clock 3 hours ahead", () => {
    expect(zoneChange("America/Los_Angeles", "America/New_York", OCT_9)).toEqual({
      kind: "shift",
      hours: 3,
      direction: "ahead",
    });
  });

  it("LOC-09 Eastern to Mountain moves the clock 2 hours back", () => {
    expect(zoneChange("America/New_York", "America/Denver", OCT_9)).toEqual({
      kind: "shift",
      hours: 2,
      direction: "back",
    });
  });

  it("LOC-09 Arizona and Pacific read the same time in October", () => {
    expect(zoneChange("America/Los_Angeles", "America/Phoenix", OCT_9)).toEqual({
      kind: "same-now",
    });
  });

  it("LOC-09 Arizona is 1 hour ahead of Pacific in January", () => {
    expect(zoneChange("America/Los_Angeles", "America/Phoenix", JAN_9)).toEqual({
      kind: "shift",
      hours: 1,
      direction: "ahead",
    });
  });
});

describe("asksZoneChange", () => {
  it("LOC-09 asks when the new place's zone name differs from the saved one", () => {
    expect(asksZoneChange("America/Los_Angeles", "America/New_York")).toBe(true);
  });

  it("LOC-09 doesn't ask for two zones with the same name", () => {
    expect(asksZoneChange("America/Denver", "America/Boise")).toBe(false);
  });

  it("LOC-09 doesn't ask when no place with a zone is saved yet", () => {
    expect(asksZoneChange(undefined, "America/New_York")).toBe(false);
  });

  it("LOC-09 doesn't ask for a new place without a zone", () => {
    expect(asksZoneChange("America/Los_Angeles", undefined)).toBe(false);
  });
});
