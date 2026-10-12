import { createJobTick } from "./schedule";

function ticker() {
  const ran: string[] = [];

  const tick = createJobTick({
    hourly: () => ran.push("hourly"),
    daily: () => ran.push("daily"),
  });

  return { ran, tick };
}

describe("createJobTick", () => {
  it("tech§6.4 runs the hourly and the daily jobs on the first tick", () => {
    const { ran, tick } = ticker();

    tick(new Date("2026-10-09T14:00:00.000Z"));

    expect(ran).toEqual(["hourly", "daily"]);
  });

  it("tech§6.4 runs the daily jobs once per UTC day and the hourly jobs every tick", () => {
    const { ran, tick } = ticker();

    tick(new Date("2026-10-09T22:00:00.000Z"));
    tick(new Date("2026-10-09T23:00:00.000Z"));
    tick(new Date("2026-10-10T00:00:00.000Z"));

    expect(ran).toEqual(["hourly", "daily", "hourly", "hourly", "daily"]);
  });

  it("tech§6.4 still runs the daily jobs when the hourly ones throw", () => {
    const ran: string[] = [];

    const tick = createJobTick({
      hourly: () => {
        throw new Error("disk full");
      },
      daily: () => ran.push("daily"),
    });

    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    tick(new Date("2026-10-09T14:00:00.000Z"));

    expect(ran).toEqual(["daily"]);
    expect(logged).toHaveBeenCalledTimes(1);

    logged.mockRestore();
  });
});
