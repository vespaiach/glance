"use client";

import * as stylex from "@stylexjs/stylex";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { Breakpoint } from "@/domain/breakpoint";
import type { Member, WeatherIcon } from "@/domain/schemas";
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
  dots: readonly Pick<Member, "id" | "color">[];
  forecast?: { icon: WeatherIcon; label: string; high: string };
};

type WeekStripProps = {
  heading: WeekHeading;
  label: string;
  days: readonly WeekDay[];
  selected: string;
  today: string;
  breakpoint: Breakpoint;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (day: string) => void;
};

const WEATHER_CELL = 124;

const DAYS = 7;

const styles = stylex.create({
  root: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
    boxSizing: "border-box",
    paddingBlock: 12,
    paddingInline: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
  },
  rootPhone: {
    gap: 4,
    paddingInline: 8,
  },
  heading: {
    flexShrink: 0,
    width: 136,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    paddingInline: 8,
  },
  range: {
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
  chevronPhone: {
    width: 44,
    height: 44,
  },
  days: {
    margin: 0,
    padding: 0,
    borderWidth: 0,
    flexGrow: 1,
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 6,
    minWidth: 0,
  },
  daysPhone: {
    gap: 2,
  },
  day: (height: number) => ({
    height,
    minWidth: 0,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingBlock: 0,
    paddingInline: 14,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    font: "inherit",
    cursor: "pointer",
    transitionProperty: "transform, background-color",
    transitionDuration: `${motion.durPress}, ${motion.durFast}`,
    transitionTimingFunction: motion.easeOut,
  }),
  dayPhone: {
    paddingInline: 4,
  },
  selected: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
  today: {
    boxShadow: `inset 0 0 0 2px ${colors.black}`,
  },
  dayText: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 3,
    minWidth: 0,
  },
  dayTextPhone: {
    alignItems: "center",
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
  datePhone: {
    fontSize: 20,
  },
  dots: {
    display: "flex",
    gap: 2,
    height: 6,
    maxWidth: "min(46px, 100%)",
    overflow: "hidden",
  },
  forecast: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    fontSize: 16,
    fontWeight: 480,
  },
});

const DAY_HEIGHT: Record<Breakpoint, number> = { wide: 80, mid: 72, narrow: 72, phone: 60 };

export function WeekStrip({
  heading,
  label,
  days,
  selected,
  today,
  breakpoint,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  onSelect,
}: WeekStripProps) {
  const grid = useRef<HTMLFieldSetElement>(null);

  const width = useBoxSize(grid)?.width ?? 0;

  const phone = breakpoint === "phone";

  const roomy = breakpoint === "wide" || breakpoint === "mid";

  const weather = roomy && width / DAYS >= WEATHER_CELL;

  const chevron = phone ? styles.chevronPhone : undefined;

  return (
    <div {...stylex.props(styles.root, phone && styles.rootPhone)}>
      {roomy && (
        <div {...stylex.props(styles.heading)}>
          <span {...stylex.props(styles.range)}>{heading.range}</span>
          <span {...stylex.props(styles.month)}>{heading.month}</span>
        </div>
      )}
      <IconButton
        icon={ChevronLeft}
        label={previousLabel}
        size="touch"
        onClick={onPrevious}
        xstyle={chevron}
      />
      <fieldset
        ref={grid}
        aria-label={label}
        {...stylex.props(styles.days, phone && styles.daysPhone)}
      >
        {days.map((day) => (
          <DayPill
            key={day.key}
            day={day}
            selected={day.key === selected}
            today={day.key === today}
            height={DAY_HEIGHT[breakpoint]}
            phone={phone}
            weather={weather}
            onClick={() => onSelect(day.key)}
          />
        ))}
      </fieldset>
      <IconButton
        icon={ChevronRight}
        label={nextLabel}
        size="touch"
        onClick={onNext}
        xstyle={chevron}
      />
    </div>
  );
}

type DayPillProps = {
  day: WeekDay;
  selected: boolean;
  today: boolean;
  height: number;
  phone: boolean;
  weather: boolean;
  onClick: () => void;
};

function DayPill({ day, selected, today, height, phone, weather, onClick }: DayPillProps) {
  return (
    <button
      type="button"
      aria-label={day.name}
      aria-pressed={selected}
      aria-current={today ? "date" : undefined}
      onClick={onClick}
      {...stylex.props(
        styles.day(height),
        phone && styles.dayPhone,
        selected && styles.selected,
        today && !selected && styles.today,
        press.scale,
      )}
    >
      <span {...stylex.props(styles.dayText, phone && styles.dayTextPhone)}>
        <span {...stylex.props(styles.weekday)}>{day.weekday}</span>
        <span {...stylex.props(styles.date, phone && styles.datePhone)}>{day.date}</span>
        <span {...stylex.props(styles.dots)}>
          {day.dots.map((dot) => (
            <PersonDot key={dot.id} color={dot.color} size="xs" />
          ))}
        </span>
      </span>
      {weather && day.forecast && (
        <span {...stylex.props(styles.forecast)}>
          <Icon
            icon={weatherIcons[day.forecast.icon]}
            size={24}
            strokeWidth={1.5}
            label={day.forecast.label}
          />
          {day.forecast.high}
        </span>
      )}
    </button>
  );
}
