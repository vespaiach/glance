import { DEFAULT_SETTINGS } from "./defaults";
import { idleDue, inAmbientHours } from "./idle";

const hours = DEFAULT_SETTINGS.ambientHours;

const at = (time: string) => new Date(`2026-10-09T${time}:00`);

describe("inAmbientHours", () => {
  it.each([
    ["17:59", false],
    ["18:00", true],
    ["23:59", true],
    ["00:00", true],
    ["07:29", true],
    ["07:30", false],
    ["10:41", false],
  ])("AMB-05 at %s is %s for 6:00 PM – 7:30 AM", (time, expected) => {
    expect(inAmbientHours(hours, at(time))).toBe(expected);
  });
});

describe("idleDue", () => {
  const last = at("10:00");

  it.each([
    [60, "10:00", false],
    [60, "10:01", true],
    [180, "10:02", false],
    [180, "10:03", true],
  ])("IDLE-01 timeout %ss is due at %s: %s", (timeout, time, expected) => {
    expect(idleDue(last, at(time), timeout as 60 | 180)).toBe(expected);
  });

  it("IDLE-01 Never is never due", () => {
    expect(idleDue(last, at("23:00"), null)).toBe(false);
  });
});
