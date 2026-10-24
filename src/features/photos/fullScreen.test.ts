import { fullScreen } from "./fullScreen";

const CLOSED = { kind: "closed" } as const;

test("PHOTO-14 opening always starts with both rows shown", () => {
  expect(fullScreen(CLOSED, { type: "open" })).toEqual({ kind: "open", chrome: true });
});

test("PHOTO-14 tapping the photo hides both rows, and tapping again shows them", () => {
  const hidden = fullScreen({ kind: "open", chrome: true }, { type: "toggleChrome" });

  expect(hidden).toEqual({ kind: "open", chrome: false });
  expect(fullScreen(hidden, { type: "toggleChrome" })).toEqual({ kind: "open", chrome: true });
});

test("PHOTO-14 Exit closes full screen, and reopening shows the rows again", () => {
  const closed = fullScreen({ kind: "open", chrome: false }, { type: "exit" });

  expect(closed).toEqual(CLOSED);
  expect(fullScreen(closed, { type: "open" })).toEqual({ kind: "open", chrome: true });
});

test("PHOTO-14 a closed full screen ignores a tap on the photo", () => {
  expect(fullScreen(CLOSED, { type: "toggleChrome" })).toBe(CLOSED);
});
