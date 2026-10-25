"use client";

import * as stylex from "@stylexjs/stylex";
import { type ReactNode, type RefObject, useEffect, useRef } from "react";
import type { Breakpoint } from "@/domain/breakpoint";
import { colors, motion } from "@/theme/tokens.stylex";
import { dialogKeyDown, useFocusOnOpen } from "./dialogFocus";

type PageProps = {
  label: string;
  breakpoint: Breakpoint;
  onEscape: () => void;
  leaving?: boolean;
  onLeft: () => void;
  keyboardInset?: number;
  children: ReactNode;
};

type Direction = "in" | "out";

const SLIDE_MS = 280;

const SLIDE_IN_EASING = "cubic-bezier(.2,.7,.2,1)";

const SLIDE_OUT_EASING = "cubic-bezier(.6,0,.8,.3)";

const styles = stylex.create({
  root: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    overflow: "hidden",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    outline: "none",
    transitionProperty: "bottom",
    transitionDuration: motion.durBase,
    transitionTimingFunction: motion.easeOut,
  },
  aboveKeyboard: (inset: number) => ({ bottom: inset }),
  leaving: {
    pointerEvents: "none",
  },
});

const sizes = stylex.create({
  large: { padding: 48, gap: 24 },
  normal: { padding: 24, gap: 16 },
  small: { padding: 12, gap: 12 },
});

export function Page({
  label,
  breakpoint,
  onEscape,
  leaving = false,
  onLeft,
  keyboardInset = 0,
  children,
}: PageProps) {
  const page = useRef<HTMLDivElement>(null);

  useFocusOnOpen(page);

  useSlide(page, leaving, onLeft);

  return (
    <div
      ref={page}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onKeyDown={dialogKeyDown(onEscape)}
      {...stylex.props(
        styles.root,
        sizes[breakpoint],
        styles.aboveKeyboard(keyboardInset),
        leaving && styles.leaving,
      )}
    >
      {children}
    </div>
  );
}

function useSlide(page: RefObject<HTMLElement | null>, leaving: boolean, onLeft: () => void) {
  const left = useRef(onLeft);

  left.current = onLeft;

  useEffect(() => {
    if (page.current) slide(page.current, "in");
  }, [page]);

  useEffect(() => {
    if (!leaving || !page.current) return;

    const animation = slide(page.current, "out");

    if (!animation) return left.current();

    let live = true;

    void animation.finished
      .catch(() => {})
      .then(() => {
        if (live) left.current();
      });

    return () => {
      live = false;
    };
  }, [page, leaving]);
}

function slide(page: HTMLElement, direction: Direction): Animation | undefined {
  if (!page.animate || reducedMotion()) return undefined;

  const offscreen = "translateX(100%)";

  const frames = direction === "in" ? [offscreen, "none"] : ["none", offscreen];

  return page.animate(
    { transform: frames },
    {
      duration: SLIDE_MS,
      easing: direction === "in" ? SLIDE_IN_EASING : SLIDE_OUT_EASING,
      fill: "forwards",
    },
  );
}

function reducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
