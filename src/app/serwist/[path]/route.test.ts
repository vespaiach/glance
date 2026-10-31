import { GET } from "./route";

describe("GET /serwist/sw.js", () => {
  it("D16 builds a service worker that never reads process.env", async () => {
    const response = await GET(new Request("http://localhost/serwist/sw.js"), {
      params: Promise.resolve({ path: "sw.js" }),
    });

    expect((await response.text()).match(/\bprocess\.env\b[.\w]*/g)).toBeNull();
  });
});
