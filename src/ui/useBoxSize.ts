"use client";

import { type RefObject, useLayoutEffect, useState } from "react";

export type BoxSize = { width: number; height: number };

export function useBoxSize(ref: RefObject<HTMLElement | null>): BoxSize | null {
  const [size, setSize] = useState<BoxSize | null>(null);

  useLayoutEffect(() => {
    const box = ref.current;

    if (box === null) return;

    const measure = () => setSize((previous) => measured(box, previous));

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(box);

    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function measured(box: HTMLElement, previous: BoxSize | null): BoxSize | null {
  const width = box.clientWidth;
  const height = box.clientHeight;

  if (width === 0 || height === 0) return previous;

  return previous?.width === width && previous.height === height ? previous : { width, height };
}
