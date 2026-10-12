const FIXTURE_SHARE = 0.36;

const FIXTURE_MIN = 260;

const FIXTURE_MAX = 380;

export function keyboardInset(
  layoutHeight: number,
  viewportHeight: number,
  viewportTop: number,
): number {
  return Math.max(0, Math.round(layoutHeight - viewportHeight - viewportTop));
}

export function fixtureKeyboardInset(viewportHeight: number): number {
  return Math.round(Math.min(FIXTURE_MAX, Math.max(FIXTURE_MIN, viewportHeight * FIXTURE_SHARE)));
}
