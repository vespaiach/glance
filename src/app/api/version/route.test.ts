import packageJson from "../../../../package.json";
import { GET } from "./route";

describe("GET /api/version", () => {
  it("tech§6.1 answers package.json's version, never cached", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ version: packageJson.version });
  });
});
