import { type QrTile, qrTile } from "./qrTile";

const OPEN: QrTile = { kind: "open", url: "https://glance.example.com/v?t=a", issuedAt: "T0" };

describe("qrTile", () => {
  it("SIGNIN-15 Sign in another device asks for a code", () => {
    expect(qrTile({ kind: "closed" }, { type: "show" })).toEqual({ kind: "issuing" });
  });

  it("SIGNIN-15 a code that arrives opens the tile at its time", () => {
    expect(qrTile({ kind: "issuing" }, { type: "issued", url: OPEN.url, at: "T0" })).toEqual(OPEN);
  });

  it("SIGNIN-15 a code that arrives after Done keeps the tile closed", () => {
    expect(qrTile({ kind: "closed" }, { type: "issued", url: OPEN.url, at: "T0" })).toEqual({
      kind: "closed",
    });
  });

  it("SIGNIN-15 a code that can't be made shows the failure", () => {
    expect(qrTile({ kind: "issuing" }, { type: "fail" })).toEqual({ kind: "failed" });
  });

  it("SIGNIN-15 Try again asks for a new code", () => {
    expect(qrTile({ kind: "failed" }, { type: "show" })).toEqual({ kind: "issuing" });
  });

  it("SIGNIN-15 at 0:00 the open tile asks for a new code", () => {
    expect(qrTile(OPEN, { type: "expire" })).toEqual({ kind: "issuing" });
  });

  it("SIGNIN-15 0:00 does nothing once the tile is closed", () => {
    expect(qrTile({ kind: "closed" }, { type: "expire" })).toEqual({ kind: "closed" });
  });

  it("SIGNIN-15 Done closes the tile from any state", () => {
    for (const tile of [OPEN, { kind: "issuing" }, { kind: "failed" }] as const) {
      expect(qrTile(tile, { type: "close" })).toEqual({ kind: "closed" });
    }
  });
});
