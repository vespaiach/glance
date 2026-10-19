import * as stylex from "@stylexjs/stylex";
import { monthTitle } from "@/domain/month";
import { formatDayTitle } from "@/domain/time";
import { DayPanel, MonthBlock } from "@/features/calendar";
import { GalleryGroup } from "./GalleryGroup";
import {
  ALL_DAY_EVENTS,
  GALLERY_FAMILY,
  GALLERY_TZ,
  gallery,
  MARKED_DAYS,
  NOW,
  NOW_DAY,
  octoberAt,
  TODAY_EVENTS,
  TODAY_WITH_ALL_DAY,
} from "./samples";

const styles = stylex.create({
  panel: {
    width: 640,
  },
});

const UPDATED_AT = octoberAt(9, 9, 32).toISOString();

const panel = {
  members: GALLERY_FAMILY,
  title: formatDayTitle(NOW, GALLERY_TZ),
  calendarEmpty: false,
  now: NOW,
  clock: "12h",
  compact: false,
  onOpenEvent: () => {},
  onAddEvent: () => {},
  retryIn: 2,
  onRetry: () => {},
  xstyle: styles.panel,
} as const;

const month = {
  year: NOW_DAY.year,
  month: NOW_DAY.month,
  selected: NOW_DAY.day,
  marked: MARKED_DAYS,
} as const;

export function CalendarGallery() {
  return (
    <GalleryGroup title={gallery.groups.calendarView}>
      <MonthBlock
        title={monthTitle(2026, 9, NOW, GALLERY_TZ)}
        today={NOW_DAY.day}
        cell={60}
        {...month}
      />
      <MonthBlock
        title={monthTitle(2026, 9, NOW, GALLERY_TZ)}
        today={NOW_DAY.day}
        cell={40}
        {...month}
      />
      <MonthBlock
        title={monthTitle(2027, 0, NOW, GALLERY_TZ)}
        year={2027}
        month={0}
        selected={1}
        marked={[]}
        cell={54}
      />
      <DayPanel tz={GALLERY_TZ} state={{ kind: "ready", data: TODAY_EVENTS }} {...panel} />
      <DayPanel tz={GALLERY_TZ} state={{ kind: "ready", data: TODAY_EVENTS }} {...panel} compact />
      <DayPanel
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: [ALL_DAY_EVENTS.noSchool, ALL_DAY_EVENTS.conference] }}
        {...panel}
        title={formatDayTitle(new Date(ALL_DAY_EVENTS.noSchool.startAt), "UTC")}
      />
      <DayPanel
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: TODAY_WITH_ALL_DAY }}
        {...panel}
        compact
      />
      <DayPanel tz={GALLERY_TZ} state={{ kind: "empty" }} {...panel} />
      <DayPanel tz={GALLERY_TZ} state={{ kind: "empty" }} {...panel} calendarEmpty />
      <DayPanel tz={GALLERY_TZ} state={{ kind: "loading" }} {...panel} />
      <DayPanel tz={GALLERY_TZ} state={{ kind: "failed" }} {...panel} />
      <DayPanel
        tz={GALLERY_TZ}
        state={{ kind: "ready", data: TODAY_EVENTS, updatedAt: UPDATED_AT }}
        {...panel}
      />
    </GalleryGroup>
  );
}
