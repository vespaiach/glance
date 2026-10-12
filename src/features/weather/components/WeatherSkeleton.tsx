import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii, space } from "@/theme/tokens.stylex";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { weatherLayout } from "../layout";

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: space.lg,
  },
  now: {
    minHeight: 420,
    borderRadius: radii.lg,
    backgroundColor: season.block3,
    transitionProperty: "background-color",
    transitionDuration: motion.durSeason,
    transitionTimingFunction: motion.easeInOut,
    padding: "clamp(24px, 2.6vw, 40px)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: space.lg,
  },
  reading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.md,
  },
  details: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: space.md,
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: space.lg,
    minWidth: 0,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
  },
  grow: { flexGrow: 1 },
  soft: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
  },
  banner: { height: 88 },
  hours: { height: 132 },
  days: {
    flexGrow: 1,
    minHeight: 240,
    borderRadius: radii.lg,
  },
});

const bar = (width: number) => <SkeletonBlock width={width} height={14} radius="4px" />;

export function WeatherSkeleton({ breakpoint }: { breakpoint: Breakpoint }) {
  return (
    <Skeleton label={copy.weather.loading} xstyle={[styles.grid, weatherLayout(breakpoint).grid]}>
      <div {...stylex.props(styles.now)}>
        {bar(160)}
        <div {...stylex.props(styles.reading)}>
          <SkeletonBlock width={180} height={96} radius="12px" />
          <SkeletonBlock width={96} height={96} radius={radii.full} />
        </div>
        <div {...stylex.props(styles.details)}>
          {[0, 1, 2, 3].map((detail) => (
            <SkeletonBlock key={detail} height={48} radius={radii.md} />
          ))}
        </div>
      </div>
      <div {...stylex.props(styles.panel)}>
        <div {...stylex.props(styles.soft, styles.banner)} />
        <div {...stylex.props(styles.section)}>
          {bar(140)}
          <div {...stylex.props(styles.soft, styles.hours)} />
        </div>
        <div {...stylex.props(styles.section, styles.grow)}>
          {bar(140)}
          <div {...stylex.props(styles.soft, styles.days)} />
        </div>
      </div>
    </Skeleton>
  );
}
