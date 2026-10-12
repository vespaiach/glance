import type { FixtureParams, FixtureUpload } from "@/data/repos";
import type { UploadProblem } from "@/domain/photoUpload";

export type UploadFailure = UploadProblem | "network";

type TileBase = { id: string; title: string; preview?: string };

export type UploadTile =
  | (TileBase & { state: "uploading"; percent: number })
  | (TileBase & { state: "paused"; percent: number })
  | (TileBase & { state: "failed"; reason: UploadFailure });

export type UploadSummary =
  | { kind: "none" }
  | { kind: "offline"; paused: number }
  | { kind: "failed"; failed: number }
  | { kind: "uploading"; one?: string; count: number; percent: number; failed: number };

type UploadFixture = NonNullable<FixtureParams["upload"]>;

export type FixtureUploads = Record<UploadFixture, readonly FixtureUpload[]>;

const FAILURES: Record<NonNullable<FixtureUpload["error"]>, UploadFailure> = {
  tooLarge: "too-large",
  notPhoto: "not-a-photo",
  network: "network",
};

function averagePercent(tiles: readonly { percent: number }[]): number {
  const total = tiles.reduce((sum, tile) => sum + tile.percent, 0);

  return Math.round(total / tiles.length);
}

export function uploadSummary(tiles: readonly UploadTile[], online: boolean): UploadSummary {
  const paused = tiles.filter((tile) => tile.state === "paused").length;

  if (!online) return { kind: "offline", paused };

  const running = tiles.filter((tile) => tile.state === "uploading");

  const failed = tiles.filter((tile) => tile.state === "failed").length;

  if (running.length === 0) return failed > 0 ? { kind: "failed", failed } : { kind: "none" };

  return {
    kind: "uploading",
    ...(running.length === 1 && { one: running[0]?.title }),
    count: running.length,
    percent: averagePercent(running),
    failed,
  };
}

function tileFrom(upload: FixtureUpload, index: number): UploadTile {
  const base = {
    id: `upload-${index}`,
    title: upload.title,
    ...(upload.preview && { preview: upload.preview }),
  };

  if (upload.status === "failed")
    return { ...base, state: "failed", reason: FAILURES[upload.error ?? "network"] };

  return { ...base, state: upload.status, percent: upload.progress };
}

export function initialUploads(
  fixture: FixtureParams["upload"],
  fixtures: FixtureUploads,
): UploadTile[] {
  return fixture ? fixtures[fixture].map(tileFrom) : [];
}
