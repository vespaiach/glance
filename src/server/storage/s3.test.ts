import { photoStoreContract } from "./contract";
import { type FakeS3, fakeS3 } from "./fakeS3";
import { createS3Store } from "./s3";

const AWS = {
  bucket: "glance-photos",
  region: "us-west-2",
  accessKeyId: "AKIDEXAMPLE",
  secretAccessKey: "secret",
};

let s3: FakeS3;

beforeEach(() => {
  s3 = fakeS3();
});

describe("createS3Store", () => {
  photoStoreContract(() => createS3Store(AWS, s3.fetch));

  it("tech§6.3 signs a PUT to the bucket's AWS endpoint with SigV4 for its region", async () => {
    await createS3Store(AWS, s3.fetch).put("maria/photo.thumb", new Uint8Array([1]), "image/webp");

    const [request] = s3.requests;
    expect(request?.method).toBe("PUT");
    expect(request?.url).toBe("https://glance-photos.s3.us-west-2.amazonaws.com/maria/photo.thumb");
    expect(request?.headers.get("authorization")).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/us-west-2\/s3\/aws4_request/,
    );
  });

  it("tech§6.3 addresses an S3-compatible endpoint by path", async () => {
    const store = createS3Store({ ...AWS, endpoint: "https://minio.example.com" }, s3.fetch);

    await store.remove(["maria/photo.thumb"]);

    expect(s3.requests[0]?.url).toBe("https://minio.example.com/glance-photos/maria/photo.thumb");
  });

  it("tech§6.3 throws when S3 fails with anything but a 404", async () => {
    const failing = (async () => new Response("SlowDown", { status: 503 })) as typeof fetch;

    await expect(createS3Store(AWS, failing).get("maria/photo.thumb")).rejects.toThrow("503");
  });
});
