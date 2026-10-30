import { keyboardInset, revealDelta } from "./keyboard";

describe("keyboardInset", () => {
  it("KB-01 is the layout height the visual viewport no longer covers", () => {
    expect(keyboardInset(1180, 780, 0)).toBe(400);
  });

  it("KB-01 subtracts how far the visual viewport is scrolled down", () => {
    expect(keyboardInset(1180, 780, 100)).toBe(300);
  });

  it("KB-01 is 0 with no keyboard, and never negative", () => {
    expect(keyboardInset(800, 800, 0)).toBe(0);
    expect(keyboardInset(800, 820, 0)).toBe(0);
  });

  it("KB-01 rounds to whole pixels", () => {
    expect(keyboardInset(800, 499.6, 0.2)).toBe(300);
  });
});

describe("revealDelta", () => {
  const viewport = { top: 0, bottom: 500 };

  it("KB-03 scrolls a field below the keyboard up to 16 px above it", () => {
    expect(revealDelta({ top: 600, bottom: 650 }, undefined, viewport)).toBe(166);
  });

  it("KB-03 scrolls a field above the top down to 12 px below it", () => {
    expect(revealDelta({ top: -40, bottom: 10 }, undefined, viewport)).toBe(-52);
  });

  it("KB-03 keeps the label in view when both fit and it sits at most 48 px above", () => {
    expect(revealDelta({ top: 20, bottom: 70 }, { top: -10, bottom: 10 }, viewport)).toBe(-22);
  });

  it("KB-03 drops the label when field and label don't fit together", () => {
    const short = { top: 0, bottom: 200 };

    expect(revealDelta({ top: 20, bottom: 170 }, { top: -10, bottom: 10 }, short)).toBe(0);
  });

  it("KB-03 drops a label more than 48 px above the field", () => {
    expect(revealDelta({ top: 20, bottom: 70 }, { top: -40, bottom: -20 }, viewport)).toBe(0);
  });

  it("KB-03 is 0 for a field already inside the visible area", () => {
    expect(revealDelta({ top: 100, bottom: 150 }, { top: 70, bottom: 90 }, viewport)).toBe(0);
  });

  it("KB-03 never scrolls a field taller than the area past its top", () => {
    expect(revealDelta({ top: 100, bottom: 700 }, undefined, viewport)).toBe(88);
  });
});
