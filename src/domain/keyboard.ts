export function keyboardInset(
  layoutHeight: number,
  viewportHeight: number,
  viewportTop: number,
): number {
  return Math.max(0, Math.round(layoutHeight - viewportHeight - viewportTop));
}
