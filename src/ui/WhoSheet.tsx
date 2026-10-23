"use client";

import * as stylex from "@stylexjs/stylex";
import { Check, Users, X } from "lucide-react";
import { type ReactNode, useId, useRef } from "react";
import type { Tag } from "@/domain/schemas";
import { initials } from "@/domain/tags";
import { colors, radii, shadows } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "./Button";
import { dialogKeyDown, useFocusOnOpen } from "./dialogFocus";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { press } from "./press";
import { tagFills } from "./tagFills";

export type WhoSheetLabels = {
  members: string;
  title: string;
  everyone: string;
  close: string;
  done: string;
};

type WhoSheetProps = {
  tags: readonly Tag[];
  selected: ReadonlySet<string>;
  labels: WhoSheetLabels;
  onToggle: (id: string) => void;
  onEveryone: () => void;
  onClose: () => void;
};

type RowProps = {
  name: string;
  checked: boolean;
  first?: boolean;
  avatar: ReactNode;
  onClick: () => void;
};

const styles = stylex.create({
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 10,
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
    maxHeight: "min(760px, 100%)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxSizing: "border-box",
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    boxShadow: shadows.shadow3,
    outline: "none",
  },
  header: {
    flexShrink: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingTop: 20,
    paddingInlineEnd: 20,
    paddingBottom: 8,
    paddingInlineStart: 28,
  },
  heading: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  eyebrow: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 340,
    letterSpacing: "-0.4px",
    lineHeight: 1.1,
  },
  list: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
    paddingTop: 4,
    paddingInline: 24,
    paddingBottom: 8,
  },
  row: {
    width: "100%",
    minHeight: 56,
    display: "flex",
    alignItems: "center",
    gap: 14,
    paddingBlock: 0,
    paddingInline: 4,
    borderWidth: 0,
    backgroundColor: "transparent",
    boxShadow: `inset 0 1px 0 ${colors.borderHairlineSoft}`,
    color: colors.textPrimary,
    fontFamily: "inherit",
    textAlign: "start",
    cursor: "pointer",
  },
  firstRow: {
    boxShadow: "none",
  },
  avatar: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: radii.full,
    display: "grid",
    placeItems: "center",
    fontSize: 12,
    fontWeight: 540,
  },
  soft: {
    backgroundColor: colors.surfaceSoft,
  },
  name: {
    flexGrow: 1,
    minWidth: 0,
    fontSize: 18,
    fontWeight: 480,
    letterSpacing: "-0.2px",
  },
  strong: {
    fontWeight: 540,
  },
  box: {
    flexShrink: 0,
    width: 28,
    height: 28,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    boxShadow: `inset 0 0 0 1.5px ${colors.textPrimary}`,
    color: colors.onActionPrimary,
  },
  checked: {
    backgroundColor: colors.actionPrimary,
    boxShadow: "none",
  },
  footer: {
    flexShrink: 0,
    display: "flex",
    paddingTop: 16,
    paddingInline: 24,
    paddingBottom: 24,
    boxShadow: `inset 0 1px 0 ${colors.borderHairlineSoft}`,
  },
});

export function WhoSheet({ tags, selected, labels, onToggle, onEveryone, onClose }: WhoSheetProps) {
  const titleId = useId();

  const dialog = useRef<HTMLDivElement>(null);

  useFocusOnOpen(dialog);

  const everyone = tags.every((tag) => selected.has(tag.id));

  return (
    <div {...stylex.props(styles.overlay)}>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        {...stylex.props(styles.scrim)}
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={dialogKeyDown(onClose)}
        {...stylex.props(styles.card)}
      >
        <div {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.heading)}>
            <span {...stylex.props(styles.eyebrow)}>{labels.members}</span>
            <h2 id={titleId} {...stylex.props(styles.title)}>
              {labels.title}
            </h2>
          </div>
          <IconButton icon={X} label={labels.close} onClick={onClose} />
        </div>
        <div {...stylex.props(styles.list)}>
          <Row
            first
            name={labels.everyone}
            checked={everyone}
            avatar={
              <span {...stylex.props(styles.avatar, styles.soft)}>
                <Icon icon={Users} size={16} strokeWidth={1.75} />
              </span>
            }
            onClick={onEveryone}
          />
          {tags.map((tag) => (
            <Row
              key={tag.id}
              name={tag.name}
              checked={selected.has(tag.id)}
              avatar={
                <span {...stylex.props(styles.avatar, tagFills[tag.color])}>
                  {initials(tag.name)}
                </span>
              }
              onClick={() => onToggle(tag.id)}
            />
          ))}
        </div>
        <div {...stylex.props(styles.footer)}>
          <Button variant="primary" fullWidth onClick={onClose}>
            {labels.done}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ name, checked, first = false, avatar, onClick }: RowProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a styled button keeps the 56 px row, the avatar and the press scale; role and state follow the ARIA checkbox
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      {...stylex.props(styles.row, first && styles.firstRow, press.row)}
    >
      <span aria-hidden="true">{avatar}</span>
      <span {...stylex.props(styles.name, first && styles.strong)}>{name}</span>
      <span aria-hidden="true" {...stylex.props(styles.box, checked && styles.checked)}>
        {checked && <Icon icon={Check} size={18} strokeWidth={2.5} />}
      </span>
    </button>
  );
}
