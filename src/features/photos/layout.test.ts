import { revealDelta } from "./layout";

const box = (top: number, bottom: number) => ({ top, bottom });

test("PHOTO-02 a thumb already in view doesn't scroll the grid", () => {
  expect(revealDelta(box(100, 700), box(300, 420), 12)).toBe(0);
});

test("PHOTO-02 a thumb below the view scrolls down just enough, with 12 px to spare", () => {
  expect(revealDelta(box(100, 700), box(650, 770), 12)).toBe(82);
});

test("PHOTO-02 a thumb above the view scrolls up just enough, with 12 px to spare", () => {
  expect(revealDelta(box(100, 700), box(40, 160), 12)).toBe(-72);
});
