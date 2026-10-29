import { API_KEY_IDLE, type ApiKeyRow, apiKeyRow } from "./apiKeyRow";

const KEY = "glc_live_abcdefghijklmnopqrstuvwxyz012345";

const SHOWN: ApiKeyRow = { kind: "shown", key: KEY, copied: false };

test("SET-19 Create key starts creating and the answer shows the key", () => {
  const creating = apiKeyRow(API_KEY_IDLE, { type: "create" });

  expect(creating).toEqual({ kind: "creating" });
  expect(apiKeyRow(creating, { type: "created", key: KEY })).toEqual(SHOWN);
});

test("SET-19 a failed create goes back to idle", () => {
  expect(apiKeyRow({ kind: "creating" }, { type: "failed" })).toEqual(API_KEY_IDLE);
});

test("SET-19 Copy marks the shown key copied and Done forgets it", () => {
  const copied = apiKeyRow(SHOWN, { type: "copied" });

  expect(copied).toEqual({ ...SHOWN, copied: true });
  expect(apiKeyRow(copied, { type: "done" })).toEqual(API_KEY_IDLE);
});

test("SET-19 Revoke asks first, and Cancel or Revoke key closes the question", () => {
  const asking = apiKeyRow(API_KEY_IDLE, { type: "ask" });

  expect(asking).toEqual({ kind: "asking" });
  expect(apiKeyRow(asking, { type: "cancel" })).toEqual(API_KEY_IDLE);
  expect(apiKeyRow(asking, { type: "revoke" })).toEqual(API_KEY_IDLE);
});

test("SET-19 actions that don't fit the state change nothing", () => {
  expect(apiKeyRow(SHOWN, { type: "create" })).toBe(SHOWN);
  expect(apiKeyRow(API_KEY_IDLE, { type: "created", key: KEY })).toBe(API_KEY_IDLE);
  expect(apiKeyRow(API_KEY_IDLE, { type: "copied" })).toBe(API_KEY_IDLE);
  expect(apiKeyRow(SHOWN, { type: "ask" })).toBe(SHOWN);
  expect(apiKeyRow(SHOWN, { type: "revoke" })).toBe(SHOWN);
});
