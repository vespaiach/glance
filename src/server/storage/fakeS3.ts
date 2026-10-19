type Stored = { bytes: Uint8Array<ArrayBuffer>; contentType: string };

export type FakeS3 = { fetch: typeof fetch; requests: Request[] };

export function fakeS3(): FakeS3 {
  const objects = new Map<string, Stored>();

  const requests: Request[] = [];

  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);

    requests.push(request.clone());

    return answer(objects, request);
  };

  return { fetch: fetch as typeof globalThis.fetch, requests };
}

async function answer(objects: Map<string, Stored>, request: Request): Promise<Response> {
  const url = request.url;

  if (request.method === "PUT") {
    objects.set(url, {
      bytes: new Uint8Array(await request.arrayBuffer()),
      contentType: request.headers.get("content-type") ?? "binary/octet-stream",
    });

    return new Response(null, { status: 200 });
  }

  if (request.method === "DELETE") {
    objects.delete(url);

    return new Response(null, { status: 204 });
  }

  return getAnswer(objects.get(url));
}

function getAnswer(stored: Stored | undefined): Response {
  if (!stored) return new Response("<Error><Code>NoSuchKey</Code></Error>", { status: 404 });

  return new Response(stored.bytes, {
    status: 200,
    headers: {
      "content-type": stored.contentType,
      "content-length": String(stored.bytes.length),
    },
  });
}
