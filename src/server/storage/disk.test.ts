import { readFileSync } from "node:fs";
import path from "node:path";
import { tempDirPerTest } from "../db/testDir";
import { photoStoreContract } from "./contract";
import { createDiskStore } from "./disk";

const root = tempDirPerTest();

describe("createDiskStore", () => {
  photoStoreContract(() => createDiskStore(root()));

  it("D12 writes each object under the root at its key", async () => {
    await createDiskStore(root()).put("maria/photo.thumb", new Uint8Array([1, 2, 3]), "image/webp");

    expect([...readFileSync(path.join(root(), "maria", "photo.thumb"))]).toEqual([1, 2, 3]);
  });

  it("tech§6.3 serves bytes it can't sniff as application/octet-stream", async () => {
    await createDiskStore(root()).put("maria/photo.orig", new Uint8Array([1, 2, 3]), "image/jpeg");

    expect(await createDiskStore(root()).get("maria/photo.orig")).toMatchObject({
      ok: true,
      value: { size: 3, contentType: "application/octet-stream" },
    });
  });
});
