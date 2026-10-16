import { type RefObject, useEffect, useRef } from "react";

export function useFocusWhenShown(shown: boolean, target: RefObject<HTMLElement | null>) {
  const wasShown = useRef(shown);

  useEffect(() => {
    if (shown && !wasShown.current) target.current?.focus();

    wasShown.current = shown;
  }, [shown, target]);
}
