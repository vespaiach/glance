"use client";

import { useEffect, useSyncExternalStore } from "react";
import { fixtureKeyboardInset, keyboardInset } from "@/domain/keyboard";
import { useFixtureParams } from "./fixtureOptions";

const SETTLE_MS = 280;

const TEXT_INPUT_TYPES = new Set(["text", "email", "search", "tel", "url", "password", "number"]);

const FIELDS = '[role="dialog"] textarea, [role="dialog"] input, main input';

export function isTextField(element: Element | null): boolean {
  if (element instanceof HTMLTextAreaElement) return true;

  if (element instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(element.type);

  return element instanceof HTMLElement && element.isContentEditable;
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

export function useKeyboardInset(): number {
  const simulated = useFixtureParams().kb === true;

  return useSyncExternalStore(
    subscribe,
    () => (simulated ? fixtureKeyboardInset(window.innerHeight) : liveInset()),
    () => 0,
  );
}

function focusFirstField() {
  const field = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(FIELDS);

  if (!field) return;

  const end = field.value.length;

  field.focus({ preventScroll: true });
  field.setSelectionRange(end, end);
  field.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
}

function focusWhenShown(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const observer = new MutationObserver(() => check());

  const check = () => {
    if (timer !== undefined || !document.querySelector(FIELDS)) return;

    observer.disconnect();
    timer = setTimeout(focusFirstField, SETTLE_MS);
  };

  observer.observe(document.body, { childList: true, subtree: true });
  check();

  return () => {
    observer.disconnect();
    clearTimeout(timer);
  };
}

export function useFixtureFieldFocus() {
  const simulated = useFixtureParams().kb === true;

  useEffect(() => {
    if (simulated) return focusWhenShown();
  }, [simulated]);
}
