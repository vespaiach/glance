import { existsSync } from "node:fs";
import path from "node:path";
import { tempDirPerTest } from "../db/testDir";
import { fakeS3 } from "./fakeS3";
import { createPhotoStore } from "./index";

const dataDir = tempDirPerTest();

describe("createPhotoStore", () => {
  it("tech§6.3 r2 reaches the account's R2 endpoint, signed for region auto", async () => {
    const s3 = fakeS3();

    const store = createPhotoStore(
      {
        kind: "r2",
        accountId: "abc123",
        bucket: "glance-photos",
        accessKeyId: "r2key",
        secretAccessKey: "r2secret",
      },
      s3.fetch,
    );

    await store.put("maria/photo.thumb", new Uint8Array([1]), "image/webp");

    const [request] = s3.requests;
    expect(request?.url).toBe(
      "https://abc123.r2.cloudflarestorage.com/glance-photos/maria/photo.thumb",
    );
    expect(request?.headers.get("authorization")).toMatch(/\/auto\/s3\/aws4_request/);
  });

  it("tech§6.3 s3 reaches the bucket on AWS", async () => {
    const s3 = fakeS3();

    const store = createPhotoStore(
      {
        kind: "s3",
        bucket: "glance-photos",
        region: "eu-west-1",
        accessKeyId: "key",
        secretAccessKey: "secret",
      },
      s3.fetch,
    );

    await store.remove(["maria/photo.thumb"]);

    expect(s3.requests[0]?.url).toBe(
      "https://glance-photos.s3.eu-west-1.amazonaws.com/maria/photo.thumb",
    );
  });

  it("tech§6.3 disk writes under DATA_DIR/photos", async () => {
    const store = createPhotoStore({ kind: "disk", dataDir: dataDir() });

    await store.put("maria/photo.thumb", new Uint8Array([1]), "image/webp");

    expect(existsSync(path.join(dataDir(), "photos", "maria", "photo.thumb"))).toBe(true);
  });
});
