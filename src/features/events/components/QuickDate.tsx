"use client";

import * as stylex from "@stylexjs/stylex";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { copy } from "@/copy";
import { monthCells, monthOf, monthTitle, quickDays, stepMonth } from "@/domain/quickDate";
import { formatDayTitle } from "@/domain/time";
import { parseDateKey } from "@/domain/zone";
import { colors, motion, radii, shadows } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { dialogKeyDown, useFocusOnOpen } from "@/ui/dialogFocus";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";

type QuickDateProps = {
  label: string;
  day: string;
  today: string;
  onOpen: () => void;
  onChange: (day: string) => void;
};

type PopoverProps = {
  day: string;
  today: string;
  onChange: (day: string) => void;
  onClose: () => void;
};

type ArrowProps = { icon: LucideIcon; label: string; onClick: () => void };

type MonthGridProps = { month: string; day: string; today: string; onPick: (day: string) => void };

const words = copy.events.quickDate;

const styles = stylex.create({
  wrap: {
    position: "relative",
    display: "inline-flex",
  },
  trigger: {
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginBlock: -12,
    paddingBlock: 0,
    paddingInline: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: "inherit",
    font: "inherit",
    letterSpacing: "inherit",
    textTransform: "inherit",
    cursor: "pointer",
  },
  flipped: {
    transform: "rotate(180deg)",
  },
  chevron: {
    display: "inline-flex",
    transitionProperty: "transform",
    transitionDuration: motion.durFast,
    transitionTimingFunction: motion.easeOut,
  },
  scrim: {
    position: "fixed",
    inset: 0,
    zIndex: 1,
    borderWidth: 0,
    padding: 0,
    backgroundColor: "transparent",
    cursor: "default",
  },
  popover: {
    position: "absolute",
    top: "100%",
    insetInlineStart: 0,
    zIndex: 2,
    width: 352,
    maxWidth: "calc(100vw - 32px)",
    boxSizing: "border-box",
    marginTop: 8,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    boxShadow: shadows.shadow3,
    outline: "none",
    fontFamily: type.fontSans,
    textTransform: "none",
    letterSpacing: "normal",
  },
  chips: {
    display: "flex",
    gap: 8,
  },
  chip: {
    flexGrow: 1,
    minHeight: 44,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    font: "inherit",
    fontSize: type.bodySize,
    cursor: "pointer",
  },
  month: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthTitle: {
    margin: 0,
    fontSize: type.bodySize,
    fontWeight: type.bodyLgWeight,
  },
  arrow: {
    width: 44,
    height: 44,
    display: "grid",
    placeItems: "center",
    padding: 0,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: "transparent",
    color: "inherit",
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  },
  weekday: {
    height: 32,
    display: "grid",
    placeItems: "center",
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
  },
  cell: {
    height: 44,
    display: "grid",
    placeItems: "center",
    padding: 0,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    font: "inherit",
    fontSize: type.bodySize,
    cursor: "pointer",
    transitionProperty: "transform, background-color",
    transitionDuration: `${motion.durPress}, ${motion.durFast}`,
    transitionTimingFunction: motion.easeOut,
  },
  selected: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
  today: {
    boxShadow: `inset 0 0 0 2px ${colors.black}`,
  },
});

export function QuickDate({ label, day, today, onOpen, onChange }: QuickDateProps) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    if (!open) onOpen();

    setOpen(!open);
  };

  const pick = (picked: string) => {
    setOpen(false);
    onChange(picked);
  };

  return (
    <span {...stylex.props(styles.wrap)}>
      <button
        type="button"
        aria-label={words.change(label)}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        {...stylex.props(styles.trigger, press.scale)}
      >
        <Icon icon={CalendarDays} size={16} />
        {label}
        <span {...stylex.props(styles.chevron, open && styles.flipped)}>
          <Icon icon={ChevronDown} size={16} />
        </span>
      </button>
      {open && <Popover day={day} today={today} onChange={pick} onClose={() => setOpen(false)} />}
    </span>
  );
}

function Popover({ day, today, onChange, onClose }: PopoverProps) {
  const [month, setMonth] = useState(monthOf(day));

  const dialog = useRef<HTMLDivElement>(null);

  useFocusOnOpen(dialog);

  const chips = quickDays(day, today);

  const chip = (name: string, picked: string) => (
    <button
      key={name}
      type="button"
      onClick={() => onChange(picked)}
      {...stylex.props(styles.chip, press.scale)}
    >
      {name}
    </button>
  );

  return (
    <>
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
        aria-label={words.label}
        tabIndex={-1}
        onKeyDown={dialogKeyDown(onClose)}
        {...stylex.props(styles.popover)}
      >
        <div {...stylex.props(styles.chips)}>
          {chip(words.today, chips.today)}
          {chip(words.tomorrow, chips.tomorrow)}
          {chip(words.nextWeek, chips.nextWeek)}
        </div>
        <div {...stylex.props(styles.month)}>
          <MonthArrow
            icon={ChevronLeft}
            label={words.previousMonth}
            onClick={() => setMonth(stepMonth(month, -1))}
          />
          <h3 {...stylex.props(styles.monthTitle)}>{monthTitle(month)}</h3>
          <MonthArrow
            icon={ChevronRight}
            label={words.nextMonth}
            onClick={() => setMonth(stepMonth(month, 1))}
          />
        </div>
        <MonthGrid month={month} day={day} today={today} onPick={onChange} />
      </div>
    </>
  );
}

function MonthArrow({ icon, label, onClick }: ArrowProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      {...stylex.props(styles.arrow, press.scale)}
    >
      <Icon icon={icon} size={20} />
    </button>
  );
}

function MonthGrid({ month, day, today, onPick }: MonthGridProps) {
  return (
    <div {...stylex.props(styles.grid)}>
      {words.weekdays.map((letter, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the seven weekday letters repeat and never reorder
        <span key={index} aria-hidden="true" {...stylex.props(styles.weekday)}>
          {letter}
        </span>
      ))}
      {monthCells(month).map((cell, index) =>
        cell === null ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: blank leading cells have no other identity
          <span key={index} />
        ) : (
          <button
            key={cell}
            type="button"
            aria-label={formatDayTitle(parseDateKey(cell), "UTC")}
            aria-pressed={cell === day}
            aria-current={cell === today ? "date" : undefined}
            onClick={() => onPick(cell)}
            {...stylex.props(
              styles.cell,
              cell === day && styles.selected,
              cell === today && cell !== day && styles.today,
              press.scale,
            )}
          >
            {parseDateKey(cell).getUTCDate()}
          </button>
        ),
      )}
    </div>
  );
}
