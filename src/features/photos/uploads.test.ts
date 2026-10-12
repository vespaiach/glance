import type { FixtureUpload } from "@/data/repos";
import { MAX_PHOTO_BYTES } from "@/domain/photoUpload";
import {
  chosenTile,
  initialUploads,
  type UploadTile,
  uploadFailure,
  uploadSummary,
  uploads,
} from "./uploads";

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

const file = (name: string, type: string, size = 1_000) => ({ name, type, size });

describe("chosenTile", () => {
  it("PHOTO-03 a chosen photo is titled by its file name and waits at 0%", () => {
    expect(chosenTile("a", file("IMG_2041.jpeg", "image/jpeg"), "blob:a")).toEqual({
      id: "a",
      title: "IMG_2041",
      preview: "blob:a",
      state: "uploading",
      percent: 0,
    });
  });

  it("PHOTO-04 a file over 20 MB fails as too large before the upload starts", () => {
    expect(chosenTile("a", file("big.jpg", "image/jpeg", MAX_PHOTO_BYTES + 1))).toEqual({
      id: "a",
      title: "big",
      state: "failed",
      reason: "too-large",
    });
  });

  it("PHOTO-04 a file that isn't an image fails as not a photo before the upload starts", () => {
    expect(chosenTile("a", file("Recipe card.pdf", "application/pdf"))).toMatchObject({
      state: "failed",
      reason: "not-a-photo",
    });
  });
});

describe("uploadFailure", () => {
  it("PHOTO-08 the server's size and type checks keep their reason", () => {
    expect([uploadFailure("too-large"), uploadFailure("not-a-photo")]).toEqual([
      "too-large",
      "not-a-photo",
    ]);
  });

  it("PHOTO-08 every other transport error is a network failure that can be retried", () => {
    expect(
      (["network", "server", "unauthorized", "invalid", "outdated"] as const).map(uploadFailure),
    ).toEqual(["network", "network", "network", "network", "network"]);
  });
});

describe("uploads", () => {
  const running = uploading("a", 40);

  it("PHOTO-06 chosen files go first, before the tiles already there", () => {
    const added = [uploading("b", 0), uploading("c", 0)];

    expect(uploads([running], { type: "add", tiles: added })).toEqual([...added, running]);
  });

  it("PHOTO-06 progress moves only that tile", () => {
    expect(
      uploads([running, uploading("b", 10)], { type: "progress", id: "b", percent: 18 }),
    ).toEqual([running, uploading("b", 18)]);
  });

  it("PHOTO-06 a finished upload leaves the tiles, since it is a normal photo now", () => {
    expect(uploads([running, uploading("b", 96)], { type: "done", id: "b" })).toEqual([running]);
  });

  it("PHOTO-08 a failure changes only that tile", () => {
    expect(
      uploads([running, uploading("b", 50)], { type: "fail", id: "b", reason: "network" }),
    ).toEqual([running, failed("b")]);
  });

  it("PHOTO-08 progress for a tile that already failed is ignored", () => {
    expect(uploads([failed("a")], { type: "progress", id: "a", percent: 60 })).toEqual([
      failed("a"),
    ]);
  });

  it("PHOTO-08 Try again restarts a network failure at 0%", () => {
    expect(uploads([failed("a")], { type: "retry", id: "a" })).toEqual([uploading("a", 0)]);
  });

  it("PHOTO-08 Try again leaves too large and not a photo failed", () => {
    const tooLarge: UploadTile = { id: "a", title: "a", state: "failed", reason: "too-large" };

    expect(uploads([tooLarge], { type: "retry", id: "a" })).toEqual([tooLarge]);
  });

  it("PHOTO-08 Remove drops the tile", () => {
    expect(uploads([running, failed("b")], { type: "remove", id: "b" })).toEqual([running]);
  });
});
