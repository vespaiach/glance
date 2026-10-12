import type { FixtureUpload } from "@/data/repos";
import { initialUploads, type UploadTile, uploadSummary } from "./uploads";

const uploading = (title: string, percent: number): UploadTile => ({
  id: title,
  title,
  state: "uploading",
  percent,
});

const failed = (title: string): UploadTile => ({
  id: title,
  title,
  state: "failed",
  reason: "network",
});

const paused = (title: string): UploadTile => ({
  id: title,
  title,
  state: "paused",
  percent: 40,
});

const FIXTURES: Record<"one" | "progress" | "error" | "offline", readonly FixtureUpload[]> = {
  one: [{ title: "IMG_2041", status: "uploading", progress: 64, preview: "/a.svg" }],
  progress: [],
  error: [
    { title: "IMG_3307", status: "failed", progress: 0, error: "tooLarge" },
    { title: "Recipe card", status: "failed", progress: 0, error: "notPhoto" },
    { title: "Halloween costumes", status: "failed", progress: 0, error: "network" },
  ],
  offline: [{ title: "IMG_2041", status: "paused", progress: 40 }],
};

describe("uploadSummary", () => {
  it("PHOTO-06 with nothing uploading there is no row", () => {
    expect(uploadSummary([], true)).toEqual({ kind: "none" });
  });

  it("PHOTO-06 one upload names the file and shows its percent", () => {
    expect(uploadSummary([uploading("IMG_2041", 64)], true)).toEqual({
      kind: "uploading",
      one: "IMG_2041",
      count: 1,
      percent: 64,
      failed: 0,
    });
  });

  it("PHOTO-06 several uploads show their count and the rounded average percent", () => {
    const tiles = [uploading("a", 82), uploading("b", 35), uploading("c", 0)];

    expect(uploadSummary(tiles, true)).toEqual({
      kind: "uploading",
      count: 3,
      percent: 39,
      failed: 0,
    });
  });

  it("PHOTO-08 failures alone give the failed count", () => {
    expect(uploadSummary([failed("a"), failed("b")], true)).toEqual({ kind: "failed", failed: 2 });
  });

  it("PHOTO-08 failures next to running uploads are added to the uploading row", () => {
    expect(uploadSummary([uploading("a", 50), failed("b")], true)).toMatchObject({
      kind: "uploading",
      failed: 1,
    });
  });

  it("PHOTO-09 offline counts the paused uploads", () => {
    expect(uploadSummary([paused("a"), failed("b")], false)).toEqual({
      kind: "offline",
      paused: 1,
    });
  });

  it("PHOTO-09 offline with nothing paused still shows the offline row", () => {
    expect(uploadSummary([], false)).toEqual({ kind: "offline", paused: 0 });
  });
});

describe("initialUploads", () => {
  it("PHOTO-06 starts with no uploads without a fixture", () => {
    expect(initialUploads(undefined, FIXTURES)).toEqual([]);
  });

  it("PHOTO-06 upload=one starts with one running upload", () => {
    expect(initialUploads("one", FIXTURES)).toEqual([
      { id: "upload-0", title: "IMG_2041", preview: "/a.svg", state: "uploading", percent: 64 },
    ]);
  });

  it("PHOTO-08 upload=error starts with one tile per failure reason", () => {
    expect(
      initialUploads("error", FIXTURES).map((tile) => tile.state === "failed" && tile.reason),
    ).toEqual(["too-large", "not-a-photo", "network"]);
  });

  it("PHOTO-09 upload=offline starts with a paused upload", () => {
    expect(initialUploads("offline", FIXTURES)).toEqual([
      { id: "upload-0", title: "IMG_2041", state: "paused", percent: 40 },
    ]);
  });
});
