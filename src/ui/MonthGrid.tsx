import * as stylex from "@stylexjs/stylex";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { press } from "./press";

export type MonthGridDay = { key: string; date: number; name: string; marked: boolean };

type MonthGridProps = {
  days: readonly MonthGridDay[];
  leading: number;
  weekdays: readonly string[];
  selected: string;
  today: string;
  cell: number;
  onSelect: (day: string) => void;
};

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const GAP = 6;

const DATE_RATIO = 0.34;

const DOT_RATIO = 0.14;

const styles = stylex.create({
  grid: (cell: number) => ({
    display: "grid",
    gridTemplateColumns: `repeat(7, ${cell}px)`,
    gap: GAP,
    color: colors.textPrimary,
  }),
  weekday: {
    paddingBlock: 8,
    textAlign: "center",
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    lineHeight: type.captionLh,
  },
  blank: (columns: number) => ({
    gridColumn: `span ${columns}`,
  }),
  day: (cell: number) => ({
    position: "relative",
    width: cell,
    height: cell,
    padding: 0,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: "transparent",
    color: "inherit",
    fontFamily: type.fontSans,
    fontSize: Math.round(cell * DATE_RATIO),
    fontWeight: 340,
    fontVariantNumeric: "tabular-nums",
    cursor: "pointer",
    transitionProperty: "transform, background-color",
    transitionDuration: `${motion.durPress}, ${motion.durFast}`,
    transitionTimingFunction: motion.easeOut,
  }),
  selected: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
    fontWeight: 540,
  },
  today: {
    boxShadow: `inset 0 0 0 2px ${colors.black}`,
    fontWeight: 540,
  },
  dot: (cell: number) => ({
    position: "absolute",
    left: "50%",
    bottom: Math.round(cell * DOT_RATIO),
    width: 6,
    height: 6,
    marginLeft: -3,
    borderRadius: radii.full,
    backgroundColor: season.accent,
  }),
  dotOnSelected: {
    backgroundColor: colors.white,
  },
});

export function MonthGrid({
  days,
  leading,
  weekdays,
  selected,
  today,
  cell,
  onSelect,
}: MonthGridProps) {
  return (
    <div {...stylex.props(styles.grid(cell))}>
      {WEEKDAY_KEYS.map((key, index) => (
        <span key={key} aria-hidden="true" {...stylex.props(styles.weekday)}>
          {weekdays[index]}
        </span>
      ))}
      {leading > 0 && <span {...stylex.props(styles.blank(leading))} />}
      {days.map((day) => (
        <GridDay
          key={day.key}
          day={day}
          cell={cell}
          selected={day.key === selected}
          today={day.key === today}
          onClick={() => onSelect(day.key)}
        />
      ))}
    </div>
  );
}

type GridDayProps = {
  day: MonthGridDay;
  cell: number;
  selected: boolean;
  today: boolean;
  onClick: () => void;
};

function GridDay({ day, cell, selected, today, onClick }: GridDayProps) {
  return (
    <button
      type="button"
      aria-label={day.name}
      aria-pressed={selected}
      aria-current={today ? "date" : undefined}
      onClick={onClick}
      {...stylex.props(
        styles.day(cell),
        today && !selected && styles.today,
        selected && styles.selected,
        press.scale,
      )}
    >
      {day.date}
      {day.marked && (
        <span
          data-marked=""
          aria-hidden="true"
          {...stylex.props(styles.dot(cell), selected && styles.dotOnSelected)}
        />
      )}
    </button>
  );
}
