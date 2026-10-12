import * as stylex from "@stylexjs/stylex";
import { formatMonthYear, monthCells, weekdayInitials } from "@/domain/month";
import { formatLongDate } from "@/domain/time";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";

type MonthGridProps = {
  year: number;
  month: number;
  selected?: number;
  today?: number;
  marked?: readonly number[];
  onSelect?: (day: number) => void;
  showTitle?: boolean;
  cell?: number;
  xstyle?: stylex.StyleXStyles;
};

const DOT_SIZE = 6;

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space.md,
    color: colors.textPrimary,
  },
  title: {
    fontSize: type.headlineSize,
    fontWeight: type.headlineWeight,
    letterSpacing: type.headlineLs,
  },
  grid: (cell: number) => ({
    display: "grid",
    gridTemplateColumns: `repeat(7, ${cell}px)`,
    gap: 6,
  }),
  weekday: {
    textAlign: "center",
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    paddingBlock: space.xs,
  },
  day: {
    position: "relative",
    borderWidth: 0,
    borderRadius: radii.full,
    padding: 0,
    cursor: "pointer",
    backgroundColor: "transparent",
    color: "inherit",
    fontFamily: type.fontSans,
    fontWeight: 340,
    fontVariantNumeric: "tabular-nums",
    transitionProperty: "background-color",
    transitionDuration: motion.durFast,
  },
  daySize: (cell: number) => ({
    width: cell,
    height: cell,
    fontSize: Math.round(cell * 0.34),
  }),
  today: {
    boxShadow: `inset 0 0 0 2px ${colors.black}`,
    fontWeight: 540,
  },
  selected: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
    boxShadow: "none",
    fontWeight: 540,
  },
  dot: (cell: number) => ({
    position: "absolute",
    left: "50%",
    bottom: Math.round(cell * 0.14),
    width: DOT_SIZE,
    height: DOT_SIZE,
    marginLeft: -DOT_SIZE / 2,
    borderRadius: radii.full,
    backgroundColor: season.accent,
    transitionProperty: "background-color",
    transitionDuration: motion.durSeason,
    transitionTimingFunction: motion.easeInOut,
  }),
  dotOnSelected: { backgroundColor: colors.white },
});

export function MonthGrid({
  year,
  month,
  selected,
  today,
  marked = [],
  onSelect,
  showTitle = true,
  cell = 64,
  xstyle,
}: MonthGridProps) {
  return (
    <div {...stylex.props(styles.root, xstyle)}>
      {showTitle && <div {...stylex.props(styles.title)}>{formatMonthYear(year, month)}</div>}
      <div {...stylex.props(styles.grid(cell))}>
        {weekdayInitials().map((initial, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: weekday initials repeat (S, T) and never reorder
          <div key={`weekday-${index}`} aria-hidden="true" {...stylex.props(styles.weekday)}>
            {initial}
          </div>
        ))}
        {monthCells(year, month).map((day, index) =>
          day === null ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: blank cells have no identity besides position
            <div key={`blank-${index}`} />
          ) : (
            <button
              key={day}
              type="button"
              aria-label={formatLongDate(new Date(year, month, day))}
              aria-pressed={day === selected}
              aria-current={day === today ? "date" : undefined}
              onClick={() => onSelect?.(day)}
              {...stylex.props(
                styles.day,
                styles.daySize(cell),
                day === today && styles.today,
                day === selected && styles.selected,
              )}
            >
              {day}
              {marked.includes(day) && (
                <span
                  aria-hidden="true"
                  {...stylex.props(styles.dot(cell), day === selected && styles.dotOnSelected)}
                />
              )}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
