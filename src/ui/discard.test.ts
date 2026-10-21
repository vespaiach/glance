import { type CloseFrom, closeStep } from "./discard";

test.each<[boolean, boolean, CloseFrom, ReturnType<typeof closeStep>]>([
  [false, false, "button", "close"],
  [false, false, "scrim", "close"],
  [false, true, "button", "ask"],
  [false, true, "scrim", "ask"],
  [true, true, "scrim", "stay"],
  [true, true, "button", "close"],
  [true, false, "scrim", "stay"],
  [true, false, "button", "close"],
])("§8.9 asking %s, dirty %s, from %s → %s", (asking, dirty, from, step) => {
  expect(closeStep(asking, dirty, from)).toBe(step);
});
