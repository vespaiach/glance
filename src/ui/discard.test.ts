import { type CloseFrom, closeStep, type SheetConfirm } from "./discard";

test.each<[SheetConfirm, boolean, CloseFrom, ReturnType<typeof closeStep>]>([
  [null, false, "button", "close"],
  [null, false, "scrim", "close"],
  ["delete", false, "button", "close"],
  [null, true, "button", "ask"],
  [null, true, "scrim", "ask"],
  ["delete", true, "scrim", "ask"],
  ["discard", true, "scrim", "stay"],
  ["discard", true, "button", "close"],
  ["discard", false, "scrim", "stay"],
  ["discard", false, "button", "close"],
])("§8.9 confirm %s, dirty %s, from %s → %s", (confirm, dirty, from, step) => {
  expect(closeStep(confirm, dirty, from)).toBe(step);
});
