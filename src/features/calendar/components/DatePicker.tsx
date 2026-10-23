"use client";

import * as stylex from "@stylexjs/stylex";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { copy } from "@/copy";
import { pickerMonthIndex } from "@/domain/week";
import { colors, radii, shadows } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { dialogKeyDown, useFocusOnOpen } from "@/ui/dialogFocus";
import { IconButton } from "@/ui/IconButton";
import { MonthGrid, type MonthGridDay } from "@/ui/MonthGrid";

export type PickerMonthView = {
  key: string;
  label: string;
  leading: number;
  days: readonly MonthGridDay[];
};

type DatePickerProps = {
  months: readonly PickerMonthView[];
  selected: string;
  today: string;
  cell: number;
  onSelect: (day: string) => void;
  onToday: () => void;
  onClose: () => void;
};

const MONTH_BUTTON = 44;

const styles = stylex.create({
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 10,
    display: "grid",
    placeItems: "center",
    padding: 8,
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
    maxHeight: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    overflowY: "auto",
    boxSizing: "border-box",
    paddingTop: 20,
    paddingInline: 8,
    paddingBottom: 24,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    boxShadow: shadows.shadow3,
    outline: "none",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingInlineStart: 20,
    paddingInlineEnd: 12,
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
  monthRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingInlineStart: 20,
    paddingInlineEnd: 12,
  },
  month: {
    flexGrow: 1,
    minWidth: 0,
    margin: 0,
    fontSize: 22,
    fontWeight: 540,
    letterSpacing: "-0.3px",
    lineHeight: 1.2,
  },
  monthButton: {
    width: MONTH_BUTTON,
    height: MONTH_BUTTON,
  },
  grid: {
    display: "flex",
    justifyContent: "center",
  },
});

export function DatePicker({
  months,
  selected,
  today,
  cell,
  onSelect,
  onToday,
  onClose,
}: DatePickerProps) {
  const titleId = useId();

  const dialog = useRef<HTMLDivElement>(null);

  const [index, setIndex] = useState(() => pickerMonthIndex(months, selected));

  const month = months[index];

  useFocusOnOpen(dialog);

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
        <div {...stylex.props(styles.monthRow)}>
          <h3 aria-live="polite" {...stylex.props(styles.month)}>
            {month?.label}
          </h3>
          <IconButton
            icon={ChevronLeft}
            label={copy.calendar.previousMonth}
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
            xstyle={styles.monthButton}
          />
          <IconButton
            icon={ChevronRight}
            label={copy.calendar.nextMonth}
            disabled={index === months.length - 1}
            onClick={() => setIndex(index + 1)}
            xstyle={styles.monthButton}
          />
        </div>
        {month && (
          <div {...stylex.props(styles.grid)}>
            <MonthGrid
              days={month.days}
              leading={month.leading}
              weekdays={copy.calendar.weekdayLetters}
              selected={selected}
              today={today}
              cell={cell}
              onSelect={onSelect}
            />
          </div>
        )}
      </div>
    </div>
  );
}
