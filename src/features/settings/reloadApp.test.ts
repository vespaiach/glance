import { RELOAD_IDLE, reloadApp } from "./reloadApp";

test("SET-21 Reload asks first", () => {
  expect(reloadApp(RELOAD_IDLE, { type: "ask" })).toEqual({ kind: "asking" });
});

test("SET-21 Cancel goes back without reloading", () => {
  expect(reloadApp({ kind: "asking" }, { type: "cancel" })).toEqual(RELOAD_IDLE);
});

test("SET-21 Reload now covers the screen", () => {
  expect(reloadApp({ kind: "asking" }, { type: "reload" })).toEqual({ kind: "reloading" });
});

test("SET-21 Reload now without asking first is ignored", () => {
  expect(reloadApp(RELOAD_IDLE, { type: "reload" })).toEqual(RELOAD_IDLE);
});
