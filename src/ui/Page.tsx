"use client";

import * as stylex from "@stylexjs/stylex";
import { ArrowLeft } from "lucide-react";
import { type ReactNode, type RefObject, useEffect, useId, useRef } from "react";
import { colors, motion, radii, sizes, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { dialogKeyDown, useFocusOnOpen } from "./dialogFocus";
import { Eyebrow } from "./Eyebrow";
import { useFieldInView } from "./fieldInView";
import { IconButton } from "./IconButton";

type PageProps = {
  title: string;
  eyebrow?: ReactNode;
  backLabel: string;
  onBack: () => void;
  leaving?: boolean;
  onLeft: () => void;
  compact?: boolean;
  banner?: ReactNode;
  startActions?: ReactNode;
  endActions?: ReactNode;
  keyboardInset?: number;
  backdrop?: string;
  aside?: ReactNode;
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
    overflowY: "auto",
    boxSizing: "border-box",
    padding: sizes.kioskGutter,
    backgroundColor: colors.hairlineSoft,
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    color: colors.textPrimary,
    outline: "none",
    transitionProperty: "bottom",
    transitionDuration: motion.durBase,
    transitionTimingFunction: motion.easeOut,
  },
  aboveKeyboard: (inset: number) => ({ bottom: inset }),
  backdrop: (image: string) => ({ backgroundImage: image }),
  leaving: {
    pointerEvents: "none",
  },
  column: {
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    flexShrink: 0,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: space.md,
    rowGap: space.sm,
    paddingBlock: 20,
    paddingInline: 24,
    boxSizing: "border-box",
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
  },
  headerCompact: {
    padding: 12,
  },
  heading: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  eyebrow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 12,
    minHeight: 20,
  },
  title: {
    margin: 0,
    fontSize: type.displayLgSize,
    fontWeight: type.displayLgWeight,
    letterSpacing: "-0.8px",
    lineHeight: 1.1,
    overflowWrap: "anywhere",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: space.sm,
  },
  banner: {
    paddingTop: 24,
  },
  bannerCompact: {
    paddingTop: 12,
  },
  main: {
    flexGrow: 1,
    display: "flex",
    alignItems: "stretch",
    gap: 24,
    marginTop: 24,
  },
  mainCompact: {
    marginTop: 12,
  },
  body: {
    flexGrow: 1,
    minWidth: 0,
    paddingTop: 40,
    paddingBottom: 48,
    paddingInline: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
  },
  form: {
    maxWidth: 720,
    marginInline: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  bodyCompact: {
    paddingTop: 20,
    paddingBottom: 32,
    paddingInline: 16,
  },
  bar: {
    position: "sticky",
    bottom: 0,
    zIndex: 2,
    flexShrink: 0,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.sm,
    marginTop: 12,
    padding: 12,
    boxSizing: "border-box",
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
  },
  group: {
    display: "flex",
    alignItems: "center",
    gap: space.xs,
  },
});

export function Page({
  title,
  eyebrow,
  backLabel,
  onBack,
  leaving = false,
  onLeft,
  compact = false,
  banner,
  startActions,
  endActions,
  keyboardInset = 0,
  backdrop,
  aside,
  children,
}: PageProps) {
  const titleId = useId();

  const page = useRef<HTMLDivElement>(null);

  useFocusOnOpen(page);

  useFieldInView(page, keyboardInset);

  useSlide(page, leaving, onLeft);

  const actions = (
    <>
      <div {...stylex.props(styles.group)}>{startActions}</div>
      <div {...stylex.props(styles.group)}>{endActions}</div>
    </>
  );

  return (
    <div
      ref={page}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-sheet-body
      onKeyDown={dialogKeyDown(onBack)}
      {...stylex.props(
        styles.root,
        styles.aboveKeyboard(keyboardInset),
        backdrop !== undefined && styles.backdrop(backdrop),
        leaving && styles.leaving,
      )}
    >
      <div {...stylex.props(styles.column)}>
        <div data-page-header {...stylex.props(styles.header, compact && styles.headerCompact)}>
          <IconButton icon={ArrowLeft} label={backLabel} size="touch" onClick={onBack} />
          <div {...stylex.props(styles.heading)}>
            {eyebrow && <Eyebrow xstyle={styles.eyebrow}>{eyebrow}</Eyebrow>}
            <h2 id={titleId} {...stylex.props(styles.title)}>
              {title}
            </h2>
          </div>
          {!compact && <div {...stylex.props(styles.actions)}>{actions}</div>}
        </div>
        {banner && (
          <div {...stylex.props(styles.banner, compact && styles.bannerCompact)}>{banner}</div>
        )}
        <div {...stylex.props(styles.main, compact && styles.mainCompact)}>
          <div {...stylex.props(styles.body, compact && styles.bodyCompact)}>
            <div {...stylex.props(styles.form)}>{children}</div>
          </div>
          {aside}
        </div>
        {compact && (
          <div data-page-bar {...stylex.props(styles.bar)}>
            {actions}
          </div>
        )}
      </div>
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
