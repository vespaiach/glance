import { type KeyboardEvent, type RefObject, useEffect } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusOnOpen(dialog: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const opener = document.activeElement;

    dialog.current?.focus();

    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [dialog]);
}

export function dialogKeyDown(onClose: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") return onClose();

    if (event.key !== "Tab") return;

    const target = wrapTarget(event);

    if (!target) return;

    event.preventDefault();
    target.focus();
  };
}

function wrapTarget(event: KeyboardEvent<HTMLElement>) {
  const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey) {
    const atStart =
      document.activeElement === first || document.activeElement === event.currentTarget;
    return atStart ? last : undefined;
  }

  return document.activeElement === last ? first : undefined;
}
