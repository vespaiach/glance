import "server-only";

type Job = () => unknown;

export type Jobs = { hourly: Job; daily: Job[] };

export function createJobTick({ hourly, daily }: Jobs): (now: Date) => Promise<void> {
  let lastDay: string | undefined;

  return async (now) => {
    const day = now.toISOString().slice(0, 10);

    await runSafely(hourly);

    if (day === lastDay) return;

    lastDay = day;

    for (const job of daily) await runSafely(job);
  };
}

async function runSafely(job: Job): Promise<void> {
  try {
    await job();
  } catch (error) {
    console.error(error);
  }
}
