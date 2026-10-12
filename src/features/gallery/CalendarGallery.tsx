import * as stylex from "@stylexjs/stylex";
import { monthTitle } from "@/domain/month";
import { formatDayTitle } from "@/domain/time";
import { DayPanel, MonthBlock } from "@/features/calendar";
import { GalleryGroup } from "./GalleryGroup";
import { gallery, MARKED_DAYS, NOW, TODAY_EVENTS } from "./samples";

const styles = stylex.create({
  panel: {
    width: 640,
  },
});

const panel = {
  title: formatDayTitle(NOW),
  calendarEmpty: false,
  now: NOW,
  clock: "12h",
  compact: false,
  onOpenEvent: () => {},
  onAddEvent: () => {},
  xstyle: styles.panel,
} as const;

const month = {
  year: NOW.getFullYear(),
  month: NOW.getMonth(),
  selected: NOW.getDate(),
  marked: MARKED_DAYS,
} as const;

export function CalendarGallery() {
  return (
    <GalleryGroup title={gallery.groups.calendarView}>
      <MonthBlock title={monthTitle(2026, 9, NOW)} today={NOW.getDate()} cell={60} {...month} />
      <MonthBlock title={monthTitle(2026, 9, NOW)} today={NOW.getDate()} cell={40} {...month} />
      <MonthBlock
        title={monthTitle(2027, 0, NOW)}
        year={2027}
        month={0}
        selected={1}
        marked={[]}
        cell={54}
      />
      <DayPanel state={{ kind: "ready", data: TODAY_EVENTS }} {...panel} />
      <DayPanel state={{ kind: "ready", data: TODAY_EVENTS }} {...panel} compact />
      <DayPanel state={{ kind: "empty" }} {...panel} />
      <DayPanel state={{ kind: "empty" }} {...panel} calendarEmpty />
      <DayPanel state={{ kind: "loading" }} {...panel} />
      <DayPanel state={{ kind: "failed" }} {...panel} />
    </GalleryGroup>
  );
}
