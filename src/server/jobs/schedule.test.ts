import { spyOnLoggedErrors } from "../testLog";
import { createJobTick } from "./schedule";

function ticker() {
  const ran: string[] = [];

  const tick = createJobTick({
    hourly: { expireNotes: () => ran.push("hourly") },
    daily: { cleanupSignIns: () => ran.push("daily") },
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

  it("tech§6.4 still runs the daily jobs when the hourly ones throw, and logs the job's name", async () => {
    const ran: string[] = [];

    const tick = createJobTick({
      hourly: {
        expireNotes: () => {
          throw new Error("disk full");
        },
      },
      daily: { cleanupSignIns: () => ran.push("daily") },
    });

    const logged = spyOnLoggedErrors();

    await tick(new Date("2026-10-09T14:00:00.000Z"));

    expect(ran).toEqual(["daily"]);
    expect(logged()).toMatchObject([
      { source: "job", event: "job-failed", job: "expireNotes", error: { message: "disk full" } },
    ]);
  });

  it("tech§6.4 logs a job whose promise rejects and still runs the others", async () => {
    const ran: string[] = [];

    const tick = createJobTick({
      hourly: { expireNotes: () => Promise.reject(new Error("connection refused")) },
      daily: {
        cleanupSignIns: async () => {
          ran.push("daily");
        },
      },
    });

    const logged = spyOnLoggedErrors();

    await tick(new Date("2026-10-09T14:00:00.000Z"));

    expect(ran).toEqual(["daily"]);
    expect(logged()).toMatchObject([
      { job: "expireNotes", error: { message: "connection refused" } },
    ]);
  });

  it("tech§6.4 runs every daily job when an earlier daily job throws", async () => {
    const ran: string[] = [];

    const tick = createJobTick({
      hourly: { expireNotes: () => ran.push("hourly") },
      daily: {
        cleanupSignIns: () => Promise.reject(new Error("links table locked")),
        removeDeletedPhotoFiles: () => ran.push("photos"),
      },
    });

    const logged = spyOnLoggedErrors();

    await tick(new Date("2026-10-09T14:00:00.000Z"));

    expect(ran).toEqual(["hourly", "photos"]);
    expect(logged()).toMatchObject([
      { job: "cleanupSignIns", error: { message: "links table locked" } },
    ]);
  });
});
