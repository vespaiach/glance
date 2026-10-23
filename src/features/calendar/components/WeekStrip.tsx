"use client";

import * as stylex from "@stylexjs/stylex";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { copy } from "@/copy";
import type { WeatherIcon } from "@/domain/schemas";
import type { Dot } from "@/domain/week";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { IconButton } from "@/ui/IconButton";
import { PersonDot } from "@/ui/PersonDot";
import { press } from "@/ui/press";
import { useBoxSize } from "@/ui/useBoxSize";
import { weatherIcons } from "@/ui/weatherIcons";

export type WeekDay = {
  key: string;
  weekday: string;
  date: number;
  name: string;
  count: string | undefined;
  dots: readonly Dot[];
  forecast?: { icon: WeatherIcon; label: string; high: string };
};

type WeekStripProps = {
  range: string;
  month: string;
  label: string;
  days: readonly WeekDay[];
  selected: string;
  today: string;
  wide: boolean;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (day: string) => void;
  onAddEvent: () => void;
};

type CellSize = { circle: number; count: boolean; weather: boolean };

const DAYS = 7;

const GAP = 2;

const COUNT_CELL = 120;

const WEATHER_CELL = 56;

const CIRCLE = { large: 56, small: 48 } as const;

const styles = stylex.create({
  root: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    overflow: "hidden",
    boxSizing: "border-box",
    paddingBlock: 4,
    paddingInline: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
  },
  heading: {
    flexShrink: 0,
    width: 136,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    paddingInline: 8,
    boxSizing: "border-box",
  },
  range: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.54px",
    lineHeight: 1.2,
    textTransform: "uppercase",
  },
  month: {
    fontSize: 28,
    fontWeight: 340,
    letterSpacing: "-0.4px",
    lineHeight: 1.1,
  },
  days: {
    margin: 0,
    padding: 0,
    borderWidth: 0,
    flexGrow: 1,
    flexBasis: 0,
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: GAP,
    minWidth: 0,
  },
  day: {
    minWidth: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    boxSizing: "border-box",
    paddingBlock: 8,
    paddingInline: 4,
    borderWidth: 0,
    borderRadius: 16,
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
  circle: (size: number) => ({
    flexShrink: 0,
    width: size,
    height: size,
    display: "grid",
    placeItems: "center",
    borderRadius: radii.full,
    fontSize: 28,
    fontWeight: 480,
    letterSpacing: "-0.5px",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
    transitionProperty: "background-color, color",
    transitionDuration: motion.durFast,
    transitionTimingFunction: "ease",
  }),
  selected: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
  today: {
    backgroundColor: colors.surfaceSoft,
  },
  info: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    rowGap: 2,
    columnGap: 12,
    minHeight: 18,
    maxWidth: "100%",
  },
  count: {
    fontFamily: type.fontMono,
    fontSize: 13,
    letterSpacing: "0.54px",
    lineHeight: "18px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  dots: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    height: 18,
  },
  dot: {
    display: "flex",
  },
  forecast: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    lineHeight: "18px",
    whiteSpace: "nowrap",
    fontSize: 15,
    fontWeight: 480,
    fontVariantNumeric: "tabular-nums",
  },
  end: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingInlineStart: 8,
  },
  add: {
    minHeight: 56,
    paddingBlock: 0,
    paddingInlineStart: 20,
    paddingInlineEnd: 24,
    backgroundColor: colors.surfaceSoft,
  },
});

export function WeekStrip({
  range,
  month,
  label,
  days,
  selected,
  today,
  wide,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  onSelect,
  onAddEvent,
}: WeekStripProps) {
  const grid = useRef<HTMLFieldSetElement>(null);

  const size = cellSize(useBoxSize(grid)?.width ?? 0);

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.heading)}>
        <span {...stylex.props(styles.range)}>{range}</span>
        <span {...stylex.props(styles.month)}>{month}</span>
      </div>
      <IconButton icon={ChevronLeft} label={previousLabel} size="touch" onClick={onPrevious} />
      <fieldset ref={grid} aria-label={label} {...stylex.props(styles.days)}>
        {days.map((day) => (
          <DayCell
            key={day.key}
            day={day}
            selected={day.key === selected}
            today={day.key === today}
            size={size}
            onClick={() => onSelect(day.key)}
          />
        ))}
      </fieldset>
      <IconButton icon={ChevronRight} label={nextLabel} size="touch" onClick={onNext} />
      <div {...stylex.props(styles.end)}>
        {wide ? (
          <Button variant="ghost" icon={CalendarPlus} onClick={onAddEvent} xstyle={styles.add}>
            {copy.calendar.addEvent}
          </Button>
        ) : (
          <IconButton
            icon={CalendarPlus}
            label={copy.calendar.addEvent}
            size="touch"
            onClick={onAddEvent}
          />
        )}
      </div>
    </div>
  );
}

type DayCellProps = {
  day: WeekDay;
  selected: boolean;
  today: boolean;
  size: CellSize;
  onClick: () => void;
};

function DayCell({ day, selected, today, size, onClick }: DayCellProps) {
  return (
    <button
      type="button"
      aria-label={day.name}
      aria-pressed={selected}
      aria-current={today ? "date" : undefined}
      onClick={onClick}
      {...stylex.props(styles.day, press.scale)}
    >
      <span {...stylex.props(styles.weekday)}>{day.weekday}</span>
      <span
        {...stylex.props(
          styles.circle(size.circle),
          today && !selected && styles.today,
          selected && styles.selected,
        )}
      >
        {day.date}
      </span>
      <span {...stylex.props(styles.info)}>
        {size.count && day.count && <span {...stylex.props(styles.count)}>{day.count}</span>}
        {!size.count && day.dots.length > 0 && (
          <span {...stylex.props(styles.dots)}>
            {day.dots.map((dot) => (
              <span key={dot.id} data-testid="week-dot" {...stylex.props(styles.dot)}>
                <PersonDot color={dot.color} size="xsm" />
              </span>
            ))}
          </span>
        )}
        {size.weather && day.forecast && (
          <span {...stylex.props(styles.forecast)}>
            <Icon
              icon={weatherIcons[day.forecast.icon]}
              size={18}
              strokeWidth={1.75}
              label={day.forecast.label}
            />
            {day.forecast.high}
          </span>
        )}
      </span>
    </button>
  );
}

function cellSize(gridWidth: number): CellSize {
  const cell = (gridWidth - (DAYS - 1) * GAP) / DAYS;

  return {
    circle: cell >= COUNT_CELL ? CIRCLE.large : CIRCLE.small,
    count: cell >= COUNT_CELL,
    weather: cell >= WEATHER_CELL,
  };
}
