import sharp from "sharp";
import type { PhotoStore, StoredObject } from "./store";

const KEY = "0192f3a0-0000-7000-8000-000000000001/0192f3a0-1111-7000-8000-000000000001.orig";

export function photoStoreContract(store: () => PhotoStore): void {
  it("tech§6.3 gets back the bytes it put, with their size and content type", async () => {
    const bytes = await jpeg();

    await store().put(KEY, bytes, "image/jpeg");

    const got = await store().get(KEY);

    if (!got.ok) throw new Error(got.error);
    expect(await bytesOf(got.value)).toEqual(bytes);
    expect(got.value).toMatchObject({ size: bytes.length, contentType: "image/jpeg" });
  });

  it("tech§6.3 answers not-found for a key it never stored", async () => {
    expect(await store().get(KEY)).toEqual({ ok: false, error: "not-found" });
  });

  it("tech§6.3 removes keys, and removing a missing key succeeds", async () => {
    await store().put(KEY, await jpeg(), "image/jpeg");

    await store().remove([KEY, `${KEY}-missing`]);

    expect(await store().get(KEY)).toEqual({ ok: false, error: "not-found" });
  });
}

export async function bytesOf(object: StoredObject): Promise<Uint8Array> {
  return new Uint8Array(await new Response(object.body).arrayBuffer());
}

async function jpeg(): Promise<Uint8Array<ArrayBuffer>> {
  const buffer = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#c84" } })
    .jpeg()
    .toBuffer();

  return new Uint8Array(buffer);
}
