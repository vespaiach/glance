import "server-only";
import { prepareDatabase } from "./db";
import { startJobs } from "./jobs";

export async function bootServer(): Promise<void> {
  try {
    await prepareDatabase();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  startJobs();
}
