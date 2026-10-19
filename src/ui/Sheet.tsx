import * as stylex from "@stylexjs/stylex";
import { X } from "lucide-react";
import { type ReactNode, useId, useRef } from "react";
import { colors, motion, radii, shadows, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { dialogKeyDown, useFocusOnOpen } from "./dialogFocus";
import { Eyebrow } from "./Eyebrow";
import { useFieldInView } from "./fieldInView";
import { IconButton } from "./IconButton";

type SheetProps = {
  title: string;
  eyebrow?: ReactNode;
  closeLabel: string;
  onClose: () => void;
  onScrimTap?: () => void;
  children: ReactNode;
  startActions?: ReactNode;
  endActions?: ReactNode;
  keyboardInset?: number;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 10,
    display: "grid",
    placeItems: "center",
    padding: space.lg,
    boxSizing: "border-box",
    transitionProperty: "bottom",
    transitionDuration: motion.durBase,
    transitionTimingFunction: motion.easeOut,
  },
  aboveKeyboard: (inset: number) => ({ bottom: inset }),
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
    maxWidth: 560,
    maxHeight: "100%",
    overflow: "auto",
    boxSizing: "border-box",
    padding: "clamp(24px, 3vw, 40px)",
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    boxShadow: shadows.shadow3,
    display: "flex",
    flexDirection: "column",
    gap: 24,
    outline: "none",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: space.md,
  },
  heading: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  title: {
    margin: 0,
    fontSize: type.displayLgSize,
    fontWeight: type.displayLgWeight,
    letterSpacing: "-0.8px",
    lineHeight: 1.1,
  },
  actions: {
    position: "sticky",
    bottom: "calc(-1 * clamp(24px, 3vw, 40px))",
    marginBottom: "calc(-1 * clamp(24px, 3vw, 40px))",
    paddingTop: space.xxs,
    paddingBottom: "clamp(24px, 3vw, 40px)",
    backgroundColor: "inherit",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.sm,
  },
  group: {
    display: "flex",
    gap: space.xs,
  },
});

export function Sheet({
  title,
  eyebrow,
  closeLabel,
  onClose,
  onScrimTap = onClose,
  children,
  startActions,
  endActions,
  keyboardInset = 0,
  xstyle,
}: SheetProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);

  useFocusOnOpen(dialog);

  useFieldInView(dialog, keyboardInset);

  return (
    <div {...stylex.props(styles.overlay, styles.aboveKeyboard(keyboardInset))}>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onScrimTap}
        {...stylex.props(styles.scrim)}
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={dialogKeyDown(onClose)}
        {...stylex.props(styles.card, xstyle)}
      >
        <div {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.heading)}>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <h2 id={titleId} {...stylex.props(styles.title)}>
              {title}
            </h2>
          </div>
          <IconButton icon={X} label={closeLabel} size="touch" onClick={onClose} />
        </div>
        {children}
        {(startActions || endActions) && (
          <div {...stylex.props(styles.actions)}>
            <div {...stylex.props(styles.group)}>{startActions}</div>
            <div {...stylex.props(styles.group)}>{endActions}</div>
          </div>
        )}
      </div>
    </div>
  );
}
