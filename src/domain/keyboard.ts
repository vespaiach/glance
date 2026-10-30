export type Span = { top: number; bottom: number };

const KEYBOARD_GAP = 16;

const TOP_GAP = 12;

const LABEL_REACH = 48;

export function keyboardInset(
  layoutHeight: number,
  viewportHeight: number,
  viewportTop: number,
): number {
  return Math.max(0, Math.round(layoutHeight - viewportHeight - viewportTop));
}

export function revealDelta(field: Span, label: Span | undefined, viewport: Span): number {
  const top = viewport.top + TOP_GAP;

  const bottom = viewport.bottom - KEYBOARD_GAP;

  const start = label && keepsLabel(field, label, bottom - top) ? label.top : field.top;

  if (field.bottom > bottom) return Math.min(field.bottom - bottom, start - top);

  return start < top ? start - top : 0;
}

function keepsLabel(field: Span, label: Span, room: number): boolean {
  return label.top >= field.top - LABEL_REACH && field.bottom - label.top < room;
}
