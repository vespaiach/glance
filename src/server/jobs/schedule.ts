import "server-only";
import { logError } from "../log";

type Job = () => unknown;

type NamedJobs = Record<string, Job>;

export type Jobs = { hourly: NamedJobs; daily: NamedJobs };

export function createJobTick({ hourly, daily }: Jobs): (now: Date) => Promise<void> {
  let lastDay: string | undefined;

  return async (now) => {
    const day = now.toISOString().slice(0, 10);

    await runEach(hourly);

    if (day === lastDay) return;

    lastDay = day;

    await runEach(daily);
  };
}

async function runEach(jobs: NamedJobs): Promise<void> {
  for (const [name, job] of Object.entries(jobs)) await runSafely(name, job);
}

async function runSafely(name: string, job: Job): Promise<void> {
  try {
    await job();
  } catch (error) {
    logError("job", "job-failed", error, { job: name });
  }
}
