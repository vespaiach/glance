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
  uniform?: boolean;
  hideTitle?: boolean;
  placement?: SheetPlacement;
  xstyle?: stylex.StyleXStyles;
};

export type SheetPlacement = "center" | "top" | "full";

const PAD = "clamp(24px, 3vw, 40px)";

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
  overlayTop: {
    placeItems: "start center",
    paddingTop: "clamp(16px, 6vh, 64px)",
  },
  overlayFull: {
    placeItems: "stretch",
    padding: 0,
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
    maxWidth: 560,
    maxHeight: "100%",
    overflow: "hidden",
    boxSizing: "border-box",
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    boxShadow: shadows.shadow3,
    display: "flex",
    flexDirection: "column",
    outline: "none",
  },
  header: {
    position: "relative",
    zIndex: 1,
    flexShrink: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: space.md,
    paddingTop: PAD,
    paddingInline: PAD,
    paddingBottom: 12,
    backgroundColor: colors.surfaceCanvas,
    boxShadow: shadows.sheetHeader,
  },
  headerCentered: {
    alignItems: "center",
  },
  hiddenTitle: {
    position: "absolute",
    width: 1,
    height: 1,
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
  },
  cardTop: {
    maxWidth: 640,
  },
  cardFull: {
    maxWidth: "none",
    height: "100%",
    borderRadius: 0,
  },
  bodyFitted: {
    flexGrow: 0,
  },
  heading: {
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
  },
  body: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 20,
    paddingBlock: 20,
    paddingInline: PAD,
  },
  actions: {
    position: "relative",
    zIndex: 1,
    flexShrink: 0,
    paddingTop: 16,
    paddingInline: PAD,
    paddingBottom: PAD,
    backgroundColor: colors.surfaceCanvas,
    boxShadow: shadows.sheetFooter,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.sm,
  },
  cardFill: {
    backgroundColor: "inherit",
    boxShadow: "none",
  },
  group: {
    display: "flex",
    gap: space.xs,
  },
  endGroup: {
    marginLeft: "auto",
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
  uniform = false,
  hideTitle = false,
  placement = "center",
  xstyle,
}: SheetProps) {
  const titleId = useId();

  const dialog = useRef<HTMLDivElement>(null);

  const body = useRef<HTMLDivElement>(null);

  useFocusOnOpen(dialog);

  useFieldInView(body, keyboardInset);

  return (
    <div
      {...stylex.props(
        styles.overlay,
        styles.aboveKeyboard(keyboardInset),
        placement === "top" && styles.overlayTop,
        placement === "full" && styles.overlayFull,
      )}
    >
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
        {...stylex.props(
          styles.card,
          xstyle,
          placement === "top" && styles.cardTop,
          placement === "full" && styles.cardFull,
        )}
      >
        <div
          {...stylex.props(
            styles.header,
            uniform && styles.cardFill,
            hideTitle && styles.headerCentered,
          )}
        >
          <div {...stylex.props(styles.heading)}>
            {eyebrow && <Eyebrow xstyle={styles.eyebrow}>{eyebrow}</Eyebrow>}
            <h2 id={titleId} {...stylex.props(styles.title, hideTitle && styles.hiddenTitle)}>
              {title}
            </h2>
          </div>
          <IconButton icon={X} label={closeLabel} size="touch" onClick={onClose} />
        </div>
        <div
          ref={body}
          data-sheet-body
          {...stylex.props(styles.body, placement === "full" && styles.bodyFitted)}
        >
          {children}
        </div>
        {(startActions || endActions) && (
          <div {...stylex.props(styles.actions, uniform && styles.cardFill)}>
            <div {...stylex.props(styles.group)}>{startActions}</div>
            <div {...stylex.props(styles.group, styles.endGroup)}>{endActions}</div>
          </div>
        )}
      </div>
    </div>
  );
}
