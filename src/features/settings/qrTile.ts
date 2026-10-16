export type QrTile =
  | { kind: "closed" }
  | { kind: "issuing" }
  | { kind: "open"; url: string; issuedAt: string }
  | { kind: "failed" };

export type QrAction =
  | { type: "show" }
  | { type: "issued"; url: string; at: string }
  | { type: "fail" }
  | { type: "expire" }
  | { type: "close" };

export type QrFixture = "open" | "failed";

const ISSUING: QrTile = { kind: "issuing" };

const CLOSED: QrTile = { kind: "closed" };

export function qrTile(tile: QrTile, action: QrAction): QrTile {
  switch (action.type) {
    case "show":
      return tile.kind === "closed" || tile.kind === "failed" ? ISSUING : tile;
    case "issued":
      return tile.kind === "issuing"
        ? { kind: "open", url: action.url, issuedAt: action.at }
        : tile;
    case "fail":
      return tile.kind === "issuing" ? { kind: "failed" } : tile;
    case "expire":
      return tile.kind === "open" ? ISSUING : tile;
    case "close":
      return CLOSED;
  }
}

export function initialQrTile(fixture: QrFixture | undefined): QrTile {
  if (fixture === "open") return ISSUING;

  return fixture === "failed" ? { kind: "failed" } : CLOSED;
}
