"use client";

import * as stylex from "@stylexjs/stylex";
import { type ReactNode, useRef } from "react";
import { colors, radii, shadows } from "@/theme/tokens.stylex";
import { dialogKeyDown, useFocusOnOpen } from "./dialogFocus";

type DialogProps = {
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
};

const styles = stylex.create({
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 30,
    display: "grid",
    placeItems: "center",
    padding: 16,
    boxSizing: "border-box",
  },
  scrim: {
    position: "absolute",
    inset: 0,
    borderWidth: 0,
    padding: 0,
    backgroundColor: colors.scrim,
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: 480,
    maxHeight: "calc(100% - 32px)",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 24,
    paddingTop: 28,
    paddingInline: 24,
    paddingBottom: 24,
    boxSizing: "border-box",
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    boxShadow: shadows.shadow3,
    outline: "none",
  },
});

export function Dialog({ labelledBy, onClose, children }: DialogProps) {
  const dialog = useRef<HTMLDivElement>(null);

  useFocusOnOpen(dialog);

  return (
    <div {...stylex.props(styles.overlay)}>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="dialog-scrim"
        onClick={onClose}
        {...stylex.props(styles.scrim)}
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onKeyDown={dialogKeyDown(onClose)}
        {...stylex.props(styles.card)}
      >
        {children}
      </div>
    </div>
  );
}
