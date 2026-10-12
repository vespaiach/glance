import { type RefObject, useEffect } from "react";

const FIELD_GAP = 24;

function focusedField(area: HTMLElement): HTMLInputElement | HTMLTextAreaElement | undefined {
  const active = document.activeElement;

  const isField = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;

  return isField && area.contains(active) ? active : undefined;
}

function reveal(area: HTMLElement) {
  const field = focusedField(area);

  if (!field) return;

  const target = field.labels?.[0] ?? field;

  const offset = target.getBoundingClientRect().top - area.getBoundingClientRect().top;

  area.scrollTop += offset - FIELD_GAP;
}

export function useFieldInView(area: RefObject<HTMLElement | null>, keyboardInset: number) {
  useEffect(() => {
    const element = area.current;

    if (!element || keyboardInset === 0) return;

    const onFocus = () => reveal(element);

    reveal(element);
    element.addEventListener("focusin", onFocus);

    return () => element.removeEventListener("focusin", onFocus);
  }, [area, keyboardInset]);
}
