import { type RefObject, useEffect, useState } from "react";
import { revealDelta, type Span } from "@/domain/keyboard";

const SETTLE_MS = 350;

export function useFieldInView(area: RefObject<HTMLElement | null>, keyboardInset: number): number {
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const element = area.current;

    if (!element) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    let frame = 0;

    const onFocusIn = () => {
      setFocused(focusedField(element) !== undefined);
      reveal(element);
      clearTimeout(timer);
      timer = setTimeout(() => reveal(element), SETTLE_MS);
    };

    const onFocusOut = () => setFocused(false);

    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => reveal(element));
    };

    onFocusIn();
    element.addEventListener("focusin", onFocusIn);
    element.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", onResize);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      element.removeEventListener("focusin", onFocusIn);
      element.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [area]);

  return focused ? keyboardInset : 0;
}

function focusedField(area: HTMLElement): HTMLInputElement | HTMLTextAreaElement | undefined {
  const active = document.activeElement;

  const isField = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;

  return isField && area.contains(active) ? active : undefined;
}

function reveal(area: HTMLElement) {
  const field = focusedField(area);

  const viewport = window.visualViewport;

  if (!field || !viewport) return;

  const label = field.labels?.[0]?.getBoundingClientRect();

  const delta = revealDelta(field.getBoundingClientRect(), label, visibleArea(area, viewport));

  if (Math.abs(delta) < 1) return;

  scrollOutward(field, area, delta);
}

function visibleArea(area: HTMLElement, viewport: VisualViewport): Span {
  const box = area.getBoundingClientRect();

  return {
    top: Math.max(viewport.offsetTop, box.top + topClearance(area)),
    bottom: Math.min(viewport.offsetTop + viewport.height, box.bottom),
  };
}

function scrollOutward(field: HTMLElement, area: HTMLElement, delta: number) {
  let left = delta;

  for (let node = field.parentElement; node && Math.abs(left) >= 1; node = node.parentElement) {
    if (node === document.documentElement) break;

    if (node === area || scrolls(node)) left -= scrollBy(node, left);
  }

  if (Math.abs(left) >= 1) window.scrollBy(0, left);
}

function scrolls(element: HTMLElement): boolean {
  return /auto|scroll/.test(getComputedStyle(element).overflowY);
}

function scrollBy(element: HTMLElement, delta: number): number {
  const before = element.scrollTop;

  element.scrollTop = before + delta;

  return element.scrollTop - before;
}

function topClearance(area: HTMLElement): number {
  const bar = area.querySelector(":scope > [data-page-top-bar]");

  return Math.max(bar?.getBoundingClientRect().height ?? 0, scrollPaddingTop(area));
}

function scrollPaddingTop(area: HTMLElement): number {
  return Number.parseFloat(getComputedStyle(area).scrollPaddingTop) || 0;
}
