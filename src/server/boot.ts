import "server-only";
import { prepareDatabase } from "./db";
import { startJobs } from "./jobs";
import { logError } from "./log";

export async function bootServer(): Promise<void> {
  try {
    await prepareDatabase();
  } catch (error) {
    logError("boot", "start-failed", error);
    process.exit(1);
  }

  startJobs();
}
