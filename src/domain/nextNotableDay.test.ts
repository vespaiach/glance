import { nextNotableDay } from "./nextNotableDay";

const day = (date: string, precip?: number) => ({
  date,
  icon: "cloud-rain" as const,
  high: 60,
  low: 50,
  precip,
});

const now = new Date(2026, 9, 9, 19, 12);

describe("nextNotableDay", () => {
  it("AMB-03 picks the first of the next 6 days with precip ≥ 50%", () => {
    const daily = [
      day("2026-10-09", 90),
      day("2026-10-10", 80),
      day("2026-10-11", 30),
      day("2026-10-12"),
      day("2026-10-13"),
      day("2026-10-14", 10),
      day("2026-10-15", 70),
    ];

    expect(nextNotableDay(daily, now)).toEqual(daily[1]);
  });

  it("AMB-03 exactly 50% counts", () => {
    const daily = [day("2026-10-09"), day("2026-10-10", 49), day("2026-10-11", 50)];

    expect(nextNotableDay(daily, now)?.date).toBe("2026-10-11");
  });

  it("AMB-03 none in the next 6 days gives nothing", () => {
    const daily = [
      day("2026-10-09", 90),
      day("2026-10-10", 20),
      day("2026-10-11"),
      day("2026-10-12"),
      day("2026-10-13"),
      day("2026-10-14"),
      day("2026-10-15"),
      day("2026-10-16", 90),
    ];

    expect(nextNotableDay(daily, now)).toBeUndefined();
  });

  it("AMB-03 days from a stale forecast that are today or earlier are skipped", () => {
    const daily = [day("2026-10-08", 90), day("2026-10-09", 90), day("2026-10-10", 60)];

    expect(nextNotableDay(daily, now)?.date).toBe("2026-10-10");
  });
});
