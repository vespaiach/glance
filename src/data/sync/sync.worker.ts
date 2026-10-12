import { expose } from "comlink";
import { createSyncWorker, liveWorkerDeps } from "./worker";

expose(createSyncWorker(liveWorkerDeps(self)));
