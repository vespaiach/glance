import * as stylex from "@stylexjs/stylex";
import { type ComponentProps, useState } from "react";
import { copy } from "@/copy";
import type { WeatherIcon } from "@/domain/schemas";
import { formatLongDate, formatWeekday } from "@/domain/time";
import { type Dot, pickerMonths, weekDays, weekHeading } from "@/domain/week";
import { parseDateKey } from "@/domain/zone";
import {
  CalendarDay,
  CalendarHeader,
  CalendarToolbar,
  DatePicker,
  type PickerMonthView,
  pickerCell,
  SpanLink,
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

const DOTS_MAX = 3;

const colorsOf = (indexes: readonly number[]): Dot[] =>
  indexes.slice(0, DOTS_MAX).flatMap((index) => TIMELINE_FAMILY[index] ?? []);

const DOTS: readonly Dot[][] = [
  [],
  colorsOf([0, 1, 3]),
  colorsOf([2]),
  [],
  colorsOf([0, 1, 2, 3, 4, 5, 6, 7, 8]),
  colorsOf([0, 1, 2, 3]),
  colorsOf([3, 4]),
];

const COUNTS = [0, 3, 1, 0, 9, 6, 2];

const ignore = () => {};

const week = (day = TODAY) =>
  weekDays(day).map((key, index) => {
    const date = parseDateKey(key);

    const weekday = formatWeekday(date, "UTC");

    const icon = WEEK_FORECAST[index] ?? "sun";

    return {
      key,
      weekday,
      date: date.getUTCDate(),
      name: formatLongDate(date, "UTC"),
      count: COUNTS[index] ? copy.calendar.eventCount(COUNTS[index]) : undefined,
      dots: DOTS[index] ?? [],
      forecast: { icon, label: copy.weather.icon[icon], high: `${HIGHS[index]}°` },
    };
  });

const strip = {
  label: copy.calendar.week("October", 4),
  today: TODAY,
  previousLabel: copy.calendar.previousWeek,
  nextLabel: copy.calendar.nextWeek,
  onPrevious: ignore,
  onNext: ignore,
  onSelect: ignore,
  onAddEvent: ignore,
} as const;

const STRIPS: readonly { label: string; width: number; day: string; wide: boolean }[] = [
  { label: gallery.calendarView.stripLarge, width: 1840, day: TODAY, wide: true },
  { label: gallery.calendarView.stripNormal, width: 940, day: TODAY, wide: false },
  { label: gallery.calendarView.stripNarrow, width: 760, day: TODAY, wide: false },
  { label: gallery.calendarView.stripOtherDay, width: 1240, day: "2026-10-07", wide: false },
  { label: gallery.calendarView.stripNextYear, width: 1240, day: "2026-12-31", wide: false },
];

function stripRange(day: string) {
  const heading = weekHeading(day, TODAY);

  return { range: copy.calendar.weekRange(heading), month: heading.month };
}

const WEEK_KEYS = weekDays(TODAY);

const PICKER_MONTHS: PickerMonthView[] = pickerMonths(TODAY).map((month) => ({
  ...month,
  days: month.days.map((key) => {
    const date = parseDateKey(key);

    return {
      key,
      date: date.getUTCDate(),
      name: formatLongDate(date, "UTC"),
      marked: (COUNTS[WEEK_KEYS.indexOf(key)] ?? 0) > 0,
    };
  }),
}));

const EVERY_TAG = new Set(TIMELINE_FAMILY.map((one) => one.id));

const toolbar = {
  tags: TIMELINE_FAMILY,
  small: false,
  onFilter: ignore,
} as const;

const day: Omit<DayProps, "toolbar" | "spanLink" | "state"> = {
  tags: TIMELINE_FAMILY,
  filter: EVERY_TAG,
  calendarEmpty: false,
  day: TODAY,
  now: NOW,
  tz: GALLERY_TZ,
  clock: "12h",
  breakpoint: "large",
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
  tagIds: TIMELINE_FAMILY.slice(0, 2).map((one) => one.id),
  reminder: "15min",
} as const;

const words = gallery.calendarView;

const DAYS: readonly {
  label: string;
  height: number;
  outside?: number;
  today?: boolean;
  props: Partial<DayProps>;
}[] = [
  { label: words.today, height: 760, props: {} },
  {
    label: words.otherDay,
    height: 560,
    today: true,
    props: { day: "2026-10-07", state: { kind: "empty" } },
  },
  {
    label: words.filtered,
    height: 760,
    props: {
      filter: MOM_AND_DAD,
      state: { kind: "ready", data: [ALL_DAY, ...OCT_9_PLANS] },
    },
  },
  {
    label: words.morePlans,
    height: 760,
    outside: 2,
    props: {
      day: "2026-10-10",
      weather: { hourly: hourlyOn(10), unit: "F" },
      state: { kind: "ready", data: OCT_10_PLANS },
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
  {
    label: words.allHours24,
    height: 900,
    props: {
      day: "2026-10-10",
      span24: true,
      clock: "24h",
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
];

const SMALL_DAYS: readonly { label: string; today?: boolean; props: Partial<DayProps> }[] = [
  { label: words.small, props: {} },
  {
    label: words.smallOtherDay,
    today: true,
    props: {
      day: "2026-10-10",
      weather: { hourly: hourlyOn(10), unit: "F" },
      state: { kind: "ready", data: OCT_10_PLANS },
    },
  },
  {
    label: words.smallFiltered,
    props: { filter: MOM_AND_DAD, state: { kind: "ready", data: [ALL_DAY, ...OCT_9_PLANS] } },
  },
  {
    label: words.smallEmptyDay,
    today: true,
    props: { day: "2026-10-11", state: { kind: "empty" }, weather: undefined },
  },
  { label: words.smallNobody, props: { filter: new Set() } },
  {
    label: words.smallEmptyCalendar,
    props: { state: { kind: "empty" }, calendarEmpty: true },
  },
];

const HEADERS: readonly { label: string; day: string }[] = [
  { label: words.headerToday, day: TODAY },
  { label: words.headerOtherDay, day: "2026-10-07" },
];

export function CalendarGallery() {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <GalleryGroup title={gallery.groups.calendarView}>
      {STRIPS.map((demo) => (
        <div key={demo.label} {...stylex.props(styles.frame(demo.width), styles.backdrop)}>
          <Eyebrow>{demo.label}</Eyebrow>
          <WeekStrip
            {...strip}
            {...stripRange(demo.day)}
            days={week(demo.day)}
            selected={demo.day}
            wide={demo.wide}
          />
        </div>
      ))}
      {HEADERS.map((demo) => (
        <div key={demo.label} {...stylex.props(styles.frame(390), styles.backdrop)}>
          <Eyebrow>{demo.label}</Eyebrow>
          <CalendarHeader
            {...strip}
            {...stripRange(demo.day)}
            days={week(demo.day)}
            selected={demo.day}
            pickLabel={copy.calendar.pickDateFor(formatLongDate(parseDateKey(demo.day), "UTC"))}
            onOpenPicker={() => setPicked(demo.day)}
          />
        </div>
      ))}
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
          cell={pickerCell(390)}
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
                  filter={demo.props.filter ?? EVERY_TAG}
                  {...(demo.today && { onToday: ignore })}
                />
              }
              spanLink={
                <SpanLink
                  on={demo.props.span24 ?? false}
                  outside={demo.outside ?? 0}
                  clock={demo.props.clock ?? "12h"}
                  onToggle={ignore}
                />
              }
            />
          </div>
        </div>
      ))}
      {SMALL_DAYS.map((demo) => (
        <div key={demo.label} {...stylex.props(styles.frame(390), styles.backdrop)}>
          <Eyebrow>{demo.label}</Eyebrow>
          <CalendarDay
            state={{ kind: "ready", data: OCT_9_PLANS }}
            {...day}
            breakpoint="small"
            {...demo.props}
            toolbar={
              <CalendarToolbar
                {...toolbar}
                small
                filter={demo.props.filter ?? EVERY_TAG}
                {...(demo.today && { onToday: ignore })}
              />
            }
            spanLink={null}
          />
        </div>
      ))}
    </GalleryGroup>
  );
}
