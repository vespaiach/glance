import * as stylex from "@stylexjs/stylex";
import { CalendarPlus, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { copy } from "@/copy";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "@/ui/Icon";
import { IconButton } from "@/ui/IconButton";
import { PersonDot } from "@/ui/PersonDot";
import { press } from "@/ui/press";
import type { WeekDay } from "./WeekStrip";

type CalendarHeaderProps = {
  range: string;
  month: string;
  label: string;
  pickLabel: string;
  days: readonly WeekDay[];
  selected: string;
  today: string;
  onOpenPicker: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onAddEvent: () => void;
  onSelect: (day: string) => void;
};

const BUTTON = 44;

const styles = stylex.create({
  root: {
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
    boxSizing: "border-box",
    paddingTop: 12,
    paddingInline: 12,
    paddingBottom: 8,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
  },
  top: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  heading: {
    flexGrow: 1,
    minWidth: 0,
    minHeight: 56,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 4,
    paddingBlock: 0,
    paddingInlineStart: 12,
    paddingInlineEnd: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: "inherit",
    font: "inherit",
    textAlign: "start",
    cursor: "pointer",
    transformOrigin: "left center",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  range: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.54px",
    lineHeight: 1.2,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  monthLine: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    maxWidth: "100%",
  },
  month: {
    fontSize: 24,
    fontWeight: 340,
    letterSpacing: "-0.3px",
    lineHeight: 1.1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  button: {
    width: BUTTON,
    height: BUTTON,
  },
  days: {
    margin: 0,
    padding: 0,
    borderWidth: 0,
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 2,
    minWidth: 0,
  },
  day: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    boxSizing: "border-box",
    paddingTop: 4,
    paddingBottom: 6,
    paddingInline: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    font: "inherit",
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
  },
  weekday: {
    fontFamily: type.fontMono,
    fontSize: 13,
    letterSpacing: "0.54px",
    lineHeight: "16px",
    textTransform: "uppercase",
  },
  circle: {
    flexShrink: 0,
    width: "100%",
    maxWidth: BUTTON,
    aspectRatio: "1",
    display: "grid",
    placeItems: "center",
    borderRadius: radii.full,
    fontSize: 20,
    fontWeight: 480,
    letterSpacing: "-0.5px",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
    transitionProperty: "background-color, color",
    transitionDuration: motion.durFast,
    transitionTimingFunction: "ease",
  },
  selected: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
  today: {
    backgroundColor: colors.surfaceSoft,
  },
  dots: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    height: 8,
  },
  dot: {
    display: "flex",
  },
});

export function CalendarHeader({
  range,
  month,
  label,
  pickLabel,
  days,
  selected,
  today,
  onOpenPicker,
  onPrevious,
  onNext,
  onAddEvent,
  onSelect,
}: CalendarHeaderProps) {
  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.top)}>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={pickLabel}
          onClick={onOpenPicker}
          {...stylex.props(styles.heading, press.scale)}
        >
          <span {...stylex.props(styles.range)}>{range}</span>
          <span {...stylex.props(styles.monthLine)}>
            <span {...stylex.props(styles.month)}>{month}</span>
            <Icon icon={ChevronDown} size={20} strokeWidth={2} />
          </span>
        </button>
        <IconButton
          icon={ChevronLeft}
          label={copy.calendar.previousWeek}
          onClick={onPrevious}
          xstyle={styles.button}
        />
        <IconButton
          icon={ChevronRight}
          label={copy.calendar.nextWeek}
          onClick={onNext}
          xstyle={styles.button}
        />
        <IconButton
          icon={CalendarPlus}
          label={copy.calendar.addEvent}
          onClick={onAddEvent}
          xstyle={styles.button}
        />
      </div>
      <fieldset aria-label={label} {...stylex.props(styles.days)}>
        {days.map((day, index) => (
          <MiniDay
            key={day.key}
            day={day}
            letter={copy.calendar.weekdayLetters[index] ?? ""}
            selected={day.key === selected}
            today={day.key === today}
            onClick={() => onSelect(day.key)}
          />
        ))}
      </fieldset>
    </div>
  );
}

type MiniDayProps = {
  day: WeekDay;
  letter: string;
  selected: boolean;
  today: boolean;
  onClick: () => void;
};

function MiniDay({ day, letter, selected, today, onClick }: MiniDayProps) {
  return (
    <button
      type="button"
      aria-label={day.name}
      aria-pressed={selected}
      aria-current={today ? "date" : undefined}
      onClick={onClick}
      {...stylex.props(styles.day, press.scale)}
    >
      <span {...stylex.props(styles.weekday)}>{letter}</span>
      <span
        {...stylex.props(
          styles.circle,
          today && !selected && styles.today,
          selected && styles.selected,
        )}
      >
        {day.date}
      </span>
      <span {...stylex.props(styles.dots)}>
        {day.dots.map((dot) => (
          <span key={dot.id} data-testid="week-dot" {...stylex.props(styles.dot)}>
            <PersonDot color={dot.color} size="xs" />
          </span>
        ))}
      </span>
    </button>
  );
}
