import { expose } from "comlink";
import { createSyncWorker, liveWorkerDeps } from "./worker";

const deps = liveWorkerDeps(self);

self.addEventListener("error", (event) =>
  deps.report("worker-crashed", event.error ?? event.message),
);

self.addEventListener("unhandledrejection", (event) => deps.report("worker-crashed", event.reason));

expose(createSyncWorker(deps));
