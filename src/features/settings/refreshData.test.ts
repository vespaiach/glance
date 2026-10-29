import { REFRESH_IDLE, type RefreshData, refreshData } from "./refreshData";

const BUSY: RefreshData = { kind: "busy" };

test("SET-20 Refresh starts refreshing from idle, done or failed", () => {
  expect(refreshData(REFRESH_IDLE, { type: "refresh" })).toEqual(BUSY);
  expect(refreshData({ kind: "done" }, { type: "refresh" })).toEqual(BUSY);
  expect(refreshData({ kind: "fail" }, { type: "refresh" })).toEqual(BUSY);
});

test("SET-20 a tap while refreshing changes nothing", () => {
  expect(refreshData(BUSY, { type: "refresh" })).toBe(BUSY);
});

test("SET-20 the answer ends refreshing as done or failed", () => {
  expect(refreshData(BUSY, { type: "refreshed" })).toEqual({ kind: "done" });
  expect(refreshData(BUSY, { type: "failed" })).toEqual({ kind: "fail" });
});

test("SET-20 an answer when not refreshing changes nothing", () => {
  expect(refreshData(REFRESH_IDLE, { type: "refreshed" })).toBe(REFRESH_IDLE);
  expect(refreshData(REFRESH_IDLE, { type: "failed" })).toBe(REFRESH_IDLE);
});
