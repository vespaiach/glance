import type { FixtureParams, FixtureUpload, UploadError } from "@/data/repos";
import { nameFromFile } from "@/domain/photoName";
import { photoTitle, type UploadProblem, uploadProblem } from "@/domain/photoUpload";

export type UploadFailure = UploadProblem | "network";

type TileBase = { id: string; title: string; preview?: string };

export type UploadTile =
  | (TileBase & { state: "uploading"; percent: number })
  | (TileBase & { state: "paused"; percent: number })
  | (TileBase & { state: "failed"; reason: UploadFailure });

export type UploadAction =
  | { type: "add"; tiles: readonly UploadTile[] }
  | { type: "progress"; id: string; percent: number }
  | { type: "done"; id: string }
  | { type: "fail"; id: string; reason: UploadFailure }
  | { type: "retry"; id: string }
  | { type: "pause" }
  | { type: "resume"; id: string }
  | { type: "restart"; id: string }
  | { type: "remove"; id: string }
  | { type: "clear" };

type ChosenFile = { name: string; type: string; size: number };

export type UploadSummary =
  | { kind: "none" }
  | { kind: "offline"; paused: number }
  | { kind: "failed"; failed: number; retryable: boolean }
  | { kind: "uploading"; one?: string; count: number; percent: number; failed: number };

type UploadFixture = NonNullable<FixtureParams["upload"]>;

export type FixtureUploads = Record<UploadFixture, readonly FixtureUpload[]>;

const FAILURES: Record<NonNullable<FixtureUpload["error"]>, UploadFailure> = {
  tooLarge: "too-large",
  notPhoto: "not-a-photo",
  network: "network",
};

export function uploadSummary(tiles: readonly UploadTile[], online: boolean): UploadSummary {
  const paused = tiles.filter((tile) => tile.state === "paused").length;

  if (!online) return { kind: "offline", paused };

  const running = tiles.filter((tile) => tile.state === "uploading");

  const failed = tiles.filter((tile) => tile.state === "failed").length;

  if (running.length === 0)
    return failed > 0
      ? { kind: "failed", failed, retryable: tiles.some(canRetry) }
      : { kind: "none" };

  return {
    kind: "uploading",
    ...(running.length === 1 && { one: running[0]?.title }),
    count: running.length,
    percent: averagePercent(running),
    failed,
  };
}

export function canRetry(tile: UploadTile): boolean {
  return tile.state === "failed" && tile.reason === "network";
}

export function initialUploads(
  fixture: FixtureParams["upload"],
  fixtures: FixtureUploads,
): UploadTile[] {
  return fixture ? fixtures[fixture].map(tileFrom) : [];
}

export function chosenTile(id: string, file: ChosenFile, preview?: string): UploadTile {
  const title = nameFromFile(file.name) ?? photoTitle(file.name);

  const base = { id, title, ...(preview && { preview }) };

  const problem = uploadProblem(file);

  if (problem) return { ...base, state: "failed", reason: problem };

  return { ...base, state: "uploading", percent: 0 };
}

export function uploadFailure(error: UploadError): UploadFailure {
  return error === "too-large" || error === "not-a-photo" ? error : "network";
}

export function uploads(tiles: readonly UploadTile[], action: UploadAction): UploadTile[] {
  if (action.type === "add") return [...action.tiles, ...tiles];

  if (action.type === "done" || action.type === "remove")
    return tiles.filter((tile) => tile.id !== action.id);

  if (action.type === "pause") return tiles.map(paused);

  if (action.type === "clear") return tiles.filter((tile) => tile.state !== "failed");

  return tiles.map((tile) => (tile.id === action.id ? changed(tile, action) : tile));
}

function averagePercent(tiles: readonly { percent: number }[]): number {
  const total = tiles.reduce((sum, tile) => sum + tile.percent, 0);

  return Math.round(total / tiles.length);
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

function changed(tile: UploadTile, action: UploadAction): UploadTile {
  if (action.type === "progress" && tile.state === "uploading")
    return { ...tile, percent: action.percent };

  if (action.type === "fail" && tile.state === "uploading") {
    const { percent: _percent, ...base } = tile;

    return { ...base, state: "failed", reason: action.reason };
  }

  if (action.type === "retry" && tile.state === "failed" && tile.reason === "network") {
    const { reason: _reason, ...base } = tile;

    return { ...base, state: "uploading", percent: 0 };
  }

  if (action.type === "resume" && tile.state === "paused") return { ...tile, state: "uploading" };

  if (action.type === "restart" && tile.state === "paused")
    return { ...tile, state: "uploading", percent: 0 };

  return tile;
}

function paused(tile: UploadTile): UploadTile {
  return tile.state === "uploading" ? { ...tile, state: "paused" } : tile;
}
