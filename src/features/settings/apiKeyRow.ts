export type ApiKeyRow =
  | { kind: "idle" }
  | { kind: "creating" }
  | { kind: "shown"; key: string; copied: boolean }
  | { kind: "asking" };

export type ApiKeyRowAction =
  | { type: "create" }
  | { type: "created"; key: string }
  | { type: "failed" }
  | { type: "copied" }
  | { type: "done" }
  | { type: "ask" }
  | { type: "cancel" }
  | { type: "revoke" };

export const API_KEY_IDLE: ApiKeyRow = { kind: "idle" };

export function apiKeyRow(row: ApiKeyRow, action: ApiKeyRowAction): ApiKeyRow {
  switch (action.type) {
    case "create":
      return row.kind === "idle" ? { kind: "creating" } : row;
    case "created":
      return row.kind === "creating" ? { kind: "shown", key: action.key, copied: false } : row;
    case "failed":
      return row.kind === "creating" ? API_KEY_IDLE : row;
    case "copied":
      return row.kind === "shown" ? { ...row, copied: true } : row;
    case "done":
      return row.kind === "shown" ? API_KEY_IDLE : row;
    case "ask":
      return row.kind === "idle" ? { kind: "asking" } : row;
    case "cancel":
    case "revoke":
      return row.kind === "asking" ? API_KEY_IDLE : row;
  }
}
