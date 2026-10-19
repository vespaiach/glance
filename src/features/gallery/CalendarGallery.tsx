import * as stylex from "@stylexjs/stylex";
import { type ComponentProps, useState } from "react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import type { WeatherIcon } from "@/domain/schemas";
import { formatLongDate, formatMonth, formatWeekday } from "@/domain/time";
import { type Dot, pickerMonths, weekDays, weekHeading } from "@/domain/week";
import { parseDateKey } from "@/domain/zone";
import {
  CalendarDay,
  CalendarToolbar,
  DateControl,
  DatePicker,
  type PickerMonthView,
  WeekStrip,
} from "@/features/calendar";
import { colors, space } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { GalleryGroup } from "./GalleryGroup";
import { GALLERY_TZ, gallery, NOW, octoberAt } from "./samples";
import {
  hourlyOn,
  MOM_AND_DAD,
  OCT_9_PLANS,
  OCT_10_PLANS,
  TIMELINE_FAMILY,
} from "./timelineSamples";

type DayProps = ComponentProps<typeof CalendarDay>;

const styles = stylex.create({
  frame: (width: number) => ({
    width,
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
  }),
  board: (height: number) => ({
    height,
    display: "flex",
    flexDirection: "column",
  }),
  backdrop: {
    padding: space.md,
    backgroundColor: colors.surfaceSoft,
  },
});

const WEEK_FORECAST: readonly WeatherIcon[] = [
  "sun",
  "cloud-sun",
  "cloud",
  "cloud-rain",
  "cloud-drizzle",
  "cloud-sun",
  "sun",
];

const HIGHS = [66, 68, 64, 58, 61, 67, 70];

const TODAY = "2026-10-09";

const colorsOf = (indexes: readonly number[]): Dot[] =>
  indexes.flatMap((index) => TIMELINE_FAMILY[index] ?? []);

const DOTS: readonly Dot[][] = [
  [],
  colorsOf([0, 1, 3]),
  colorsOf([2]),
  [],
  colorsOf([0, 1, 2, 3, 4, 5, 6, 7, 8]),
  colorsOf([0, 1, 2, 3]),
  colorsOf([3, 4]),
];

const ignore = () => {};

const week = () =>
  weekDays(TODAY).map((key, index) => {
    const date = parseDateKey(key);

    const weekday = formatWeekday(date, "UTC");

    const icon = WEEK_FORECAST[index] ?? "sun";

    return {
      key,
      weekday,
      date: date.getUTCDate(),
      name: formatLongDate(date, "UTC"),
      dots: DOTS[index] ?? [],
      forecast: { icon, label: copy.weather.icon[icon], high: `${HIGHS[index]}°` },
    };
  });

const strip = {
  heading: weekHeading(TODAY, TODAY),
  label: copy.calendar.week("October", 4),
  selected: TODAY,
  today: TODAY,
  previousLabel: copy.calendar.previousWeek,
  nextLabel: copy.calendar.nextWeek,
  onPrevious: ignore,
  onNext: ignore,
  onSelect: ignore,
} as const;

const STRIPS: readonly [Exclude<Breakpoint, "phone">, number][] = [
  ["wide", 1600],
  ["mid", 1080],
  ["narrow", 760],
];

const WEEK_KEYS = weekDays(TODAY);

const PICKER_MONTHS: PickerMonthView[] = pickerMonths(TODAY).map((month) => ({
  ...month,
  days: month.days.map((key) => {
    const date = parseDateKey(key);

    const index = WEEK_KEYS.indexOf(key);

    return {
      key,
      weekday: formatWeekday(date, "UTC"),
      date: date.getUTCDate(),
      name: formatLongDate(date, "UTC"),
      dots: DOTS[index] ?? [],
    };
  }),
}));

const TODAY_DATE = parseDateKey(TODAY);

const toolbar = {
  members: TIMELINE_FAMILY,
  span24: false,
  outside: 0,
  phone: false,
  onToggleMember: ignore,
  onEditFamily: ignore,
  onToggleSpan: ignore,
  onAddEvent: ignore,
} as const;

const day: Omit<DayProps, "toolbar" | "state"> = {
  members: TIMELINE_FAMILY,
  filter: "everyone",
  calendarEmpty: false,
  day: TODAY,
  now: NOW,
  tz: GALLERY_TZ,
  clock: "12h",
  breakpoint: "wide",
  span24: false,
  weather: { hourly: hourlyOn(9), unit: "F" },
  retryIn: 2,
  onRetry: ignore,
  onOpenEvent: ignore,
  onAddEvent: ignore,
};

const ALL_DAY = {
  id: "0195f0a0-0000-7000-8000-000000000799",
  title: "Teacher planning day",
  startAt: "2026-10-09T00:00:00.000Z",
  allDay: true,
  location: "No school",
  everyone: false,
  memberIds: TIMELINE_FAMILY.slice(0, 2).map((one) => one.id),
} as const;

const words = gallery.calendarView;

const DAYS: readonly { label: string; height: number; props: Partial<DayProps> }[] = [
  { label: words.today, height: 760, props: {} },
  {
    label: words.filtered,
    height: 760,
    props: {
      filter: MOM_AND_DAD,
      state: { kind: "ready", data: [ALL_DAY, ...OCT_9_PLANS] },
    },
  },
  {
    label: words.allHours,
    height: 900,
    props: {
      day: "2026-10-10",
      span24: true,
      weather: { hourly: hourlyOn(10), unit: "F" },
      state: { kind: "ready", data: OCT_10_PLANS },
    },
  },
  { label: words.nobody, height: 560, props: { filter: new Set() } },
  {
    label: words.emptyDay,
    height: 560,
    props: { day: "2026-10-11", state: { kind: "empty" }, weather: undefined },
  },
  {
    label: words.emptyCalendar,
    height: 480,
    props: { state: { kind: "empty" }, calendarEmpty: true },
  },
  { label: words.loading, height: 400, props: { state: { kind: "loading" } } },
  { label: words.failed, height: 400, props: { state: { kind: "failed" } } },
  {
    label: words.saved,
    height: 640,
    props: {
      state: { kind: "ready", data: OCT_9_PLANS, updatedAt: octoberAt(9, 9, 32).toISOString() },
    },
  },
  { label: words.phone, height: 900, props: { breakpoint: "phone", weather: undefined } },
];

export function CalendarGallery() {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <GalleryGroup title={gallery.groups.calendarView}>
      {STRIPS.map(([breakpoint, width]) => (
        <div key={breakpoint} {...stylex.props(styles.frame(width), styles.backdrop)}>
          <Eyebrow>{breakpoint}</Eyebrow>
          <WeekStrip {...strip} days={week()} breakpoint={breakpoint} />
        </div>
      ))}
      <div {...stylex.props(styles.frame(358), styles.backdrop)}>
        <Eyebrow>{words.dateControl}</Eyebrow>
        <DateControl
          year={String(TODAY_DATE.getUTCFullYear())}
          month={formatMonth(TODAY_DATE, "UTC")}
          weekday={formatWeekday(TODAY_DATE, "UTC")}
          date={TODAY_DATE.getUTCDate()}
          name={formatLongDate(TODAY_DATE, "UTC")}
          onOpen={() => setPicked(TODAY)}
        />
      </div>
      <Button variant="secondary" onClick={() => setPicked(TODAY)}>
        {words.pickerToday}
      </Button>
      <Button variant="secondary" onClick={() => setPicked("2026-10-14")}>
        {words.pickerOther}
      </Button>
      {picked && (
        <DatePicker
          months={PICKER_MONTHS}
          selected={picked}
          today={TODAY}
          onSelect={() => setPicked(null)}
          onToday={() => setPicked(null)}
          onClose={() => setPicked(null)}
        />
      )}
      {DAYS.map((demo) => (
        <div key={demo.label} {...stylex.props(styles.frame(1100), styles.backdrop)}>
          <Eyebrow>{demo.label}</Eyebrow>
          <div {...stylex.props(styles.board(demo.height))}>
            <CalendarDay
              state={{ kind: "ready", data: OCT_9_PLANS }}
              {...day}
              {...demo.props}
              toolbar={
                <CalendarToolbar
                  {...toolbar}
                  filter={demo.props.filter ?? "everyone"}
                  span24={demo.props.span24 ?? false}
                  outside={demo.props.day === "2026-10-10" ? 2 : 0}
                  phone={demo.props.breakpoint === "phone"}
                />
              }
            />
          </div>
        </div>
      ))}
    </GalleryGroup>
  );
}
