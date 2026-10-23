"use client";

import * as stylex from "@stylexjs/stylex";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { Tag, WeatherIcon } from "@/domain/schemas";
import type { WeekHeading } from "@/domain/week";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
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
  dots: readonly Pick<Tag, "id" | "color">[];
  forecast?: { icon: WeatherIcon; label: string; high: string };
};

type WeekStripProps = {
  heading: WeekHeading;
  label: string;
  days: readonly WeekDay[];
  selected: string;
  today: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (day: string) => void;
};

const WEATHER_CELL = 80;

const DAYS = 7;

const GAP = 2;

const CELL_HEIGHT = 104;

const styles = stylex.create({
  root: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    overflow: "hidden",
    boxSizing: "border-box",
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
  },
  year: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
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
    position: "relative",
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: GAP,
    minWidth: 0,
  },
  indicator: (index: number) => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: `calc((100% - ${(DAYS - 1) * GAP}px) / ${DAYS})`,
    backgroundColor: colors.actionPrimary,
    transform: `translateX(calc(${index} * (100% + ${GAP}px)))`,
    transitionProperty: "transform",
    transitionDuration: motion.durBase,
    transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  }),
  day: (height: number) => ({
    position: "relative",
    zIndex: 1,
    height,
    minWidth: 0,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingBlock: 0,
    paddingInline: 10,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    font: "inherit",
    cursor: "pointer",
    transitionProperty: "transform, color, background-color",
    transitionDuration: `${motion.durPress}, 200ms, ${motion.durFast}`,
    transitionTimingFunction: motion.easeOut,
  }),
  selected: {
    color: colors.onActionPrimary,
    backgroundColor: "transparent",
  },
  today: {
    backgroundColor: colors.surfaceSoft,
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 3,
    minWidth: 0,
    paddingTop: 12,
  },
  weekday: {
    fontFamily: type.fontMono,
    fontSize: 13,
    letterSpacing: "0.54px",
    textTransform: "uppercase",
  },
  date: {
    fontSize: 28,
    fontWeight: 480,
    letterSpacing: "-0.5px",
    lineHeight: 1,
  },
  dots: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    height: 8,
    maxWidth: 50,
    overflow: "hidden",
    paddingInline: 1,
  },
  dot: {
    display: "flex",
    borderRadius: radii.full,
  },
  dotOutlined: {
    boxShadow: `0 0 0 1px ${colors.onActionPrimary}`,
  },
  forecast: {
    position: "absolute",
    top: 8,
    insetInlineEnd: 10,
    display: "flex",
    alignItems: "center",
    gap: 3,
    fontSize: 12,
    fontWeight: 480,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
});

export function WeekStrip({
  heading,
  label,
  days,
  selected,
  today,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  onSelect,
}: WeekStripProps) {
  const grid = useRef<HTMLFieldSetElement>(null);

  const width = useBoxSize(grid)?.width ?? 0;

  const weather = (width - (DAYS - 1) * GAP) / DAYS >= WEATHER_CELL;

  const index = Math.max(
    0,
    days.findIndex((day) => day.key === selected),
  );

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.heading)}>
        <span {...stylex.props(styles.year)}>{heading.year}</span>
        <span {...stylex.props(styles.month)}>{heading.month}</span>
      </div>
      <IconButton icon={ChevronLeft} label={previousLabel} size="touch" onClick={onPrevious} />
      <fieldset ref={grid} aria-label={label} {...stylex.props(styles.days)}>
        <span
          aria-hidden="true"
          data-testid="week-indicator"
          data-day={selected}
          {...stylex.props(styles.indicator(index))}
        />
        {days.map((day) => (
          <DayCell
            key={day.key}
            day={day}
            selected={day.key === selected}
            today={day.key === today}
            weather={weather}
            height={CELL_HEIGHT}
            onClick={() => onSelect(day.key)}
          />
        ))}
      </fieldset>
      <IconButton icon={ChevronRight} label={nextLabel} size="touch" onClick={onNext} />
    </div>
  );
}

type DayCellProps = {
  day: WeekDay;
  selected: boolean;
  today: boolean;
  weather: boolean;
  height: number;
  onClick: () => void;
};

function DayCell({ day, selected, today, weather, height, onClick }: DayCellProps) {
  return (
    <button
      type="button"
      aria-label={day.name}
      aria-pressed={selected}
      aria-current={today ? "date" : undefined}
      onClick={onClick}
      {...stylex.props(
        styles.day(height),
        selected && styles.selected,
        today && !selected && styles.today,
        press.scale,
      )}
    >
      <span {...stylex.props(styles.stack)}>
        <span {...stylex.props(styles.weekday)}>{day.weekday}</span>
        <span {...stylex.props(styles.date)}>{day.date}</span>
        <span {...stylex.props(styles.dots)}>
          {day.dots.map((dot) => (
            <span key={dot.id} {...stylex.props(styles.dot, selected && styles.dotOutlined)}>
              <PersonDot color={dot.color} size="xs" />
            </span>
          ))}
        </span>
      </span>
      {weather && day.forecast && (
        <span {...stylex.props(styles.forecast)}>
          <Icon
            icon={weatherIcons[day.forecast.icon]}
            size={14}
            strokeWidth={1.75}
            label={day.forecast.label}
          />
          {day.forecast.high}
        </span>
      )}
    </button>
  );
}
