"use client";

import * as stylex from "@stylexjs/stylex";
import { X } from "lucide-react";
import { type RefObject, useId, useLayoutEffect, useRef } from "react";
import { copy } from "@/copy";
import type { Dot } from "@/domain/week";
import { colors, motion, radii, shadows } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { dialogKeyDown, useFocusOnOpen } from "@/ui/dialogFocus";
import { IconButton } from "@/ui/IconButton";
import { PersonDot } from "@/ui/PersonDot";
import { press } from "@/ui/press";

export type PickerDayView = {
  key: string;
  weekday: string;
  date: number;
  name: string;
  dots: readonly Dot[];
};

export type PickerMonthView = { key: string; label: string; days: readonly PickerDayView[] };

type DatePickerProps = {
  months: readonly PickerMonthView[];
  selected: string;
  today: string;
  onSelect: (day: string) => void;
  onToday: () => void;
  onClose: () => void;
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
    height: "min(760px, 100%)",
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
    alignItems: "center",
    gap: 12,
    paddingTop: 20,
    paddingInlineEnd: 20,
    paddingBottom: 8,
    paddingInlineStart: 28,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 340,
    letterSpacing: "-0.4px",
    lineHeight: 1.1,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  list: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
    position: "relative",
    boxSizing: "border-box",
    paddingTop: 0,
    paddingInline: 16,
    paddingBottom: 24,
  },
  month: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    margin: 0,
    paddingTop: 16,
    paddingInline: 12,
    paddingBottom: 8,
    backgroundColor: colors.surfaceCanvas,
    fontFamily: type.fontMono,
    fontSize: 14,
    fontWeight: 400,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
  },
  days: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  day: {
    width: "100%",
    minHeight: 56,
    display: "flex",
    alignItems: "center",
    gap: 16,
    boxSizing: "border-box",
    paddingBlock: 0,
    paddingInline: 20,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    font: "inherit",
    textAlign: "start",
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
  weekday: {
    flexShrink: 0,
    width: 40,
    fontFamily: type.fontMono,
    fontSize: 13,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
  },
  date: {
    flexShrink: 0,
    width: 36,
    fontSize: 22,
    fontWeight: 480,
    letterSpacing: "-0.5px",
    lineHeight: 1,
  },
  dots: {
    flexGrow: 1,
    display: "flex",
    gap: 3,
    minWidth: 0,
    overflow: "hidden",
  },
  tag: {
    flexShrink: 0,
    fontFamily: type.fontMono,
    fontSize: 13,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
  },
});

export function DatePicker({
  months,
  selected,
  today,
  onSelect,
  onToday,
  onClose,
}: DatePickerProps) {
  const titleId = useId();

  const dialog = useRef<HTMLDivElement>(null);

  const list = useRef<HTMLDivElement>(null);

  useFocusOnOpen(dialog);

  useCenterOnOpen(list);

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
          <h2 id={titleId} {...stylex.props(styles.title)}>
            {copy.calendar.pickDate}
          </h2>
          <div {...stylex.props(styles.actions)}>
            <Button variant="ghost" onClick={onToday}>
              {copy.calendar.today}
            </Button>
            <IconButton icon={X} label={copy.calendar.close} onClick={onClose} />
          </div>
        </div>
        <div ref={list} {...stylex.props(styles.list)}>
          {months.map((month) => (
            <section key={month.key} aria-label={month.label}>
              <h3 {...stylex.props(styles.month)}>{month.label}</h3>
              <div {...stylex.props(styles.days)}>
                {month.days.map((day) => (
                  <PickerDay
                    key={day.key}
                    day={day}
                    selected={day.key === selected}
                    today={day.key === today}
                    onClick={() => onSelect(day.key)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

type PickerDayProps = {
  day: PickerDayView;
  selected: boolean;
  today: boolean;
  onClick: () => void;
};

function PickerDay({ day, selected, today, onClick }: PickerDayProps) {
  return (
    <button
      type="button"
      aria-label={day.name}
      aria-pressed={selected}
      aria-current={today ? "date" : undefined}
      onClick={onClick}
      {...stylex.props(
        styles.day,
        selected && styles.selected,
        today && !selected && styles.today,
        press.scale,
      )}
    >
      <span {...stylex.props(styles.weekday)}>{day.weekday}</span>
      <span {...stylex.props(styles.date)}>{day.date}</span>
      <span {...stylex.props(styles.dots)}>
        {day.dots.map((dot) => (
          <PersonDot key={dot.id} color={dot.color} size="xsm" />
        ))}
      </span>
      {today && <span {...stylex.props(styles.tag)}>{copy.calendar.today}</span>}
    </button>
  );
}

function useCenterOnOpen(list: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const box = list.current;

    const row =
      box?.querySelector<HTMLElement>('[aria-pressed="true"]') ??
      box?.querySelector<HTMLElement>('[aria-current="date"]');

    if (!box || !row) return;

    box.scrollTop = row.offsetTop - (box.clientHeight - row.offsetHeight) / 2;
  }, [list]);
}
