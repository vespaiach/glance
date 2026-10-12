import "server-only";

export type Jobs = { hourly: () => void; daily: () => void };

export function createJobTick({ hourly, daily }: Jobs): (now: Date) => void {
  let lastDay: string | undefined;

  return (now) => {
    const day = now.toISOString().slice(0, 10);

    runSafely(hourly);

    if (day === lastDay) return;

    lastDay = day;

    runSafely(daily);
  };
}

function runSafely(job: () => void): void {
  try {
    job();
  } catch (error) {
    console.error(error);
  }
}
