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
  it("tech§6.4 runs the hourly and the daily jobs on the first tick", async () => {
    const { ran, tick } = ticker();

    await tick(new Date("2026-10-09T14:00:00.000Z"));

    expect(ran).toEqual(["hourly", "daily"]);
  });

  it("tech§6.4 runs the daily jobs once per UTC day and the hourly jobs every tick", async () => {
    const { ran, tick } = ticker();

    await tick(new Date("2026-10-09T22:00:00.000Z"));
    await tick(new Date("2026-10-09T23:00:00.000Z"));
    await tick(new Date("2026-10-10T00:00:00.000Z"));

    expect(ran).toEqual(["hourly", "daily", "hourly", "hourly", "daily"]);
  });

  it("tech§6.4 still runs the daily jobs when the hourly ones throw", async () => {
    const ran: string[] = [];

    const tick = createJobTick({
      hourly: () => {
        throw new Error("disk full");
      },
      daily: () => ran.push("daily"),
    });

    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await tick(new Date("2026-10-09T14:00:00.000Z"));

    expect(ran).toEqual(["daily"]);
    expect(logged).toHaveBeenCalledTimes(1);

    logged.mockRestore();
  });

  it("tech§6.4 logs a job whose promise rejects and still runs the others", async () => {
    const ran: string[] = [];

    const tick = createJobTick({
      hourly: () => Promise.reject(new Error("connection refused")),
      daily: async () => {
        ran.push("daily");
      },
    });

    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await tick(new Date("2026-10-09T14:00:00.000Z"));

    expect(ran).toEqual(["daily"]);
    expect(logged).toHaveBeenCalledTimes(1);

    logged.mockRestore();
  });
});
