"use client";

import { useSyncExternalStore } from "react";
import { keyboardInset } from "@/domain/keyboard";

const TEXT_INPUT_TYPES = new Set(["text", "email", "search", "tel", "url", "password", "number"]);

export function isTextField(element: Element | null): boolean {
  if (element instanceof HTMLTextAreaElement) return true;

  if (element instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(element.type);

  return element instanceof HTMLElement && element.isContentEditable;
}

export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribe, liveInset, () => 0);
}

function subscribe(listener: () => void) {
  const viewport = window.visualViewport;

  viewport?.addEventListener("resize", listener);
  viewport?.addEventListener("scroll", listener);
  window.addEventListener("resize", listener);

  return () => {
    viewport?.removeEventListener("resize", listener);
    viewport?.removeEventListener("scroll", listener);
    window.removeEventListener("resize", listener);
  };
}

function liveInset(): number {
  const viewport = window.visualViewport;

  if (!viewport) return 0;

  return keyboardInset(window.innerHeight, viewport.height, viewport.offsetTop);
}
