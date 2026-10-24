import { keyboardInset } from "./keyboard";

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
