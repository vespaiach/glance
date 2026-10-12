import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const SRC = import.meta.dirname;

const LOCAL_ZONE_READS =
  /\.(getHours|getMinutes|getDate|getDay|getMonth|getFullYear)\(|new Date\(\s*[\w.]+\s*,/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) return sourceFiles(full);

    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function offendingLines(file: string): string[] {
  const lines = readFileSync(file, "utf8").split("\n");

  return lines.flatMap((line, index) =>
    LOCAL_ZONE_READS.test(line) ? [`${path.relative(SRC, file)}:${index + 1}: ${line.trim()}`] : [],
  );
}

describe("local zone guard", () => {
  it("D15 nothing in src reads the device zone through local Date getters", () => {
    const files = sourceFiles(SRC).filter((file) => !file.endsWith(path.join("domain", "zone.ts")));

    expect(files.flatMap(offendingLines)).toEqual([]);
  });
});
