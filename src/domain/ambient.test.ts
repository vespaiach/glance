import { ambientDim, ambientStatus, driftOffset, driftStep, isTomorrow } from "./ambient";
import { deviceTimeZone } from "./zone";

const tz = deviceTimeZone();

const now = new Date(2026, 9, 9, 19, 12);

const at = (date: Date) => ({ startAt: date.toISOString() });

describe("ambientDim", () => {
  it("AMB-06 dims the photo at least 0.6 whatever the setting", () => {
    expect([0, 0.2, 0.4].map(ambientDim)).toEqual([0.6, 0.6, 0.6]);
  });

  it("AMB-06 keeps a stronger dim", () => {
    expect(ambientDim(0.7)).toBe(0.7);
  });
});

describe("ambientStatus", () => {
  it("AMB-01 shows nothing when online and signed in", () => {
    expect(ambientStatus({ signedOut: false, offline: false })).toBeNull();
  });

  it("AMB-01 shows the offline notice while offline", () => {
    expect(ambientStatus({ signedOut: false, offline: true })).toBe("offline");
  });

  it("AMB-01 signed out wins over offline", () => {
    expect(ambientStatus({ signedOut: true, offline: true })).toBe("signedOut");
    expect(ambientStatus({ signedOut: true, offline: false })).toBe("signedOut");
  });
});

describe("drift", () => {
  const TWO_MIN = 2 * 60 * 1000;

  const start = new Date(2026, 9, 9, 19, 0);

  const later = (ms: number) => new Date(start.getTime() + ms);

  it("AMB-11 has 8 distinct offsets, each axis at most 6 px from rest, starting at rest", () => {
    const offsets = Array.from({ length: 8 }, (_, step) => driftOffset(step));

    expect(offsets[0]).toEqual({ x: 0, y: 0 });
    expect(new Set(offsets.map(({ x, y }) => `${x},${y}`)).size).toBe(8);
    expect(offsets.every(({ x, y }) => Math.abs(x) <= 6 && Math.abs(y) <= 6)).toBe(true);
  });

  it("AMB-11 holds one offset for 2 minutes", () => {
    expect(driftStep(later(1000))).toBe(driftStep(later(TWO_MIN - 1000)));
  });

  it("AMB-11 moves to the next offset every 2 minutes", () => {
    expect(driftStep(later(TWO_MIN))).toBe((driftStep(start) + 1) % 8);
  });

  it("AMB-11 cycles through the 8 offsets every 16 minutes", () => {
    expect(driftStep(later(8 * TWO_MIN))).toBe(driftStep(start));
  });

  it("AMB-11 wraps the step into the 8 offsets", () => {
    expect(driftOffset(9)).toEqual(driftOffset(1));
  });
});

describe("isTomorrow", () => {
  it("AMB-03 is true for any time on the next local day", () => {
    expect(isTomorrow(at(new Date(2026, 9, 10, 0, 0)), now, tz)).toBe(true);
    expect(isTomorrow(at(new Date(2026, 9, 10, 23, 59)), now, tz)).toBe(true);
  });

  it("AMB-03 is false for later days", () => {
    expect(isTomorrow(at(new Date(2026, 9, 11, 9, 0)), now, tz)).toBe(false);
  });

  it("AMB-03 crosses a month end", () => {
    expect(isTomorrow(at(new Date(2026, 10, 1, 9, 0)), new Date(2026, 9, 31, 22, 0), tz)).toBe(
      true,
    );
  });
});

describe("isTomorrow of an all-day event", () => {
  it.each(["America/Los_Angeles", "Pacific/Guam"])(
    "AMB-03 an all-day event on the next date is tomorrow in %s",
    (zone) => {
      const event = { startAt: "2026-10-10T00:00:00.000Z", allDay: true as const };

      expect(isTomorrow(event, new Date("2026-10-09T12:00:00Z"), zone)).toBe(true);
    },
  );
});

describe("isTomorrow in a zone", () => {
  it("LOC-06 compares days in the given zone", () => {
    const friday = new Date("2026-10-10T06:30:00Z");

    expect(isTomorrow({ startAt: "2026-10-10T16:00:00.000Z" }, friday, "America/Los_Angeles")).toBe(
      true,
    );
  });
});
