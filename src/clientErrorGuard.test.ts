import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const SRC = import.meta.dirname;

const REPORT_API = "/api/client-errors";

const ALLOWED = [path.join("data", "repos", "clientErrors.ts")];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) return sourceFiles(full);

    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("client error guard", () => {
  it("D37 only the error reporter calls the client error API", () => {
    const callers = sourceFiles(SRC)
      .filter((file) => !file.startsWith(path.join(SRC, "app", "api", "client-errors")))
      .filter((file) => readFileSync(file, "utf8").includes(REPORT_API))
      .map((file) => path.relative(SRC, file));

    expect(callers).toEqual(ALLOWED);
  });
});
