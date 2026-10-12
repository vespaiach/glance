import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export function tempDirPerTest(): () => string {
  let dir = "";

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "glance-db-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  return () => dir;
}
