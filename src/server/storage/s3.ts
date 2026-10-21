import "server-only";
import { AwsClient } from "aws4fetch";
import { err, ok, type Result } from "@/domain/result";
import type { PhotoStore, S3Config, StoredObject } from "./store";

export function createS3Store(config: S3Config, fetchImpl: typeof fetch): PhotoStore {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: config.region,
  });

  const send = async (key: string, init: RequestInit) =>
    fetchImpl(await client.sign(objectUrl(config, key), init));

  return {
    async put(key, body, contentType) {
      expectOk(await send(key, { method: "PUT", body, headers: { "content-type": contentType } }));
    },
    async get(key) {
      return storedObject(await send(key, { method: "GET" }));
    },
    async remove(keys) {
      const removals = await Promise.allSettled(
        keys.map(async (key) => expectOk(await send(key, { method: "DELETE" }))),
      );

      const failed = removals.find((removal) => removal.status === "rejected");

      if (failed) throw failed.reason;
    },
  };
}

function objectUrl({ bucket, region, endpoint }: S3Config, key: string): string {
  const path = key.split("/").map(encodeURIComponent).join("/");

  if (endpoint) return `${endpoint.replace(/\/+$/, "")}/${bucket}/${path}`;

  return `https://${bucket}.s3.${region}.amazonaws.com/${path}`;
}

async function storedObject(response: Response): Promise<Result<StoredObject, "not-found">> {
  if (response.status === 404) {
    await response.body?.cancel();

    return err("not-found");
  }

  expectOk(response);

  return ok({
    body: response.body ?? new Blob([]).stream(),
    size: Number(response.headers.get("content-length") ?? 0),
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
  });
}

function expectOk(response: Response): void {
  if (!response.ok) throw new Error(`Photo store request failed: ${response.status}`);
}
