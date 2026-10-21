import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { copy } from "@/copy";
import { matchesFilter } from "@/domain/tags";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { DayTimeline, type DayTimelineLabels } from "@/ui/DayTimeline";
import { Eyebrow } from "@/ui/Eyebrow";
import { GalleryGroup } from "./GalleryGroup";
import { GALLERY_TZ, gallery, NOW } from "./samples";
import {
  hourlyOn,
  MOM_AND_DAD,
  OCT_9_PLANS,
  OCT_10_PLANS,
  TIMELINE_FAMILY,
} from "./timelineSamples";

type Demo = {
  label: string;
  width: number;
  height: number;
  props: Partial<ComponentProps<typeof DayTimeline>>;
};

const LABELS: DayTimelineLabels = {
  ...copy.timeline,
  now: copy.events.now,
  everyone: copy.events.everyone,
  icons: copy.weather.icon,
};

const ALL_IDS = TIMELINE_FAMILY.map((one) => one.id);

const words = gallery.timeline;

const DEMOS: readonly Demo[] = [
  {
    label: words.today,
    width: 1100,
    height: 640,
    props: { weather: { hourly: hourlyOn(9), unit: "F" } },
  },
  {
    label: words.rain,
    width: 1100,
    height: 640,
    props: {
      day: "2026-10-10",
      plans: OCT_10_PLANS,
      weather: { hourly: hourlyOn(10), unit: "F" },
    },
  },
  {
    label: words.allHours,
    width: 1100,
    height: 760,
    props: {
      day: "2026-10-10",
      plans: OCT_10_PLANS,
      span: "24h",
      weather: { hourly: hourlyOn(10), unit: "F" },
    },
  },
  {
    label: words.filtered,
    width: 860,
    height: 640,
    props: {
      plans: OCT_9_PLANS.filter((plan) => matchesFilter(plan, MOM_AND_DAD, ALL_IDS)),
      free: "some",
      breakpoint: "mid",
    },
  },
  { label: words.empty, width: 860, height: 640, props: { day: "2026-10-11", plans: [] } },
  {
    label: words.nobody,
    width: 860,
    height: 640,
    props: { plans: [], free: "none", breakpoint: "narrow" },
  },
  { label: words.phone, width: 358, height: 720, props: { breakpoint: "phone" } },
  {
    label: words.schedule,
    width: 560,
    height: 760,
    props: { variant: "today", weather: { hourly: hourlyOn(9), unit: "F" } },
  },
  {
    label: words.schedulePhone,
    width: 358,
    height: 560,
    props: { variant: "today", breakpoint: "phone", weather: { hourly: hourlyOn(9), unit: "F" } },
  },
];

const styles = stylex.create({
  frame: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
  },
  card: (width: number, height: number) => ({
    width,
    height,
    display: "flex",
    boxSizing: "border-box",
    paddingInline: space.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
  }),
});

const ignore = () => {};

export function TimelineGallery() {
  return (
    <GalleryGroup title={gallery.groups.timeline}>
      {DEMOS.map((demo) => (
        <div key={demo.label} {...stylex.props(styles.frame)}>
          <Eyebrow>{demo.label}</Eyebrow>
          <div {...stylex.props(styles.card(demo.width, demo.height))}>
            <DayTimeline
              plans={OCT_9_PLANS}
              tags={TIMELINE_FAMILY}
              day="2026-10-09"
              now={NOW}
              tz={GALLERY_TZ}
              clock="12h"
              variant="calendar"
              breakpoint="wide"
              free="everyone"
              labels={LABELS}
              onOpenEvent={ignore}
              onAddEvent={ignore}
              {...demo.props}
            />
          </div>
        </div>
      ))}
    </GalleryGroup>
  );
}
