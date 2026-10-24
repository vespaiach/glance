import * as stylex from "@stylexjs/stylex";
import { Clock, Sunset } from "lucide-react";
import { copy } from "@/copy";
import { type DayRibbon, RIBBON_END, RIBBON_START, type RibbonLabel } from "@/domain/dayRibbon";
import {
  type Clock as ClockSetting,
  formatClock,
  formatDuration,
  formatHour,
  minutesOfDay,
} from "@/domain/time";
import type { TodayHero } from "@/domain/todayHero";
import { colors, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";

type OpenDayProps = {
  hero: Extract<TodayHero<never>, { kind: "none" | "ended" }>;
  ribbon: DayRibbon;
  now: Date;
  clock: ClockSetting;
  tz: string;
};

const MARKER = 32;

const LABEL_SHIFT: Record<RibbonLabel, string> = {
  start: "translateX(0)",
  center: "translateX(-50%)",
  end: "translateX(-100%)",
};

const mono = {
  fontFamily: type.fontMono,
  letterSpacing: "0.54px",
  textTransform: "uppercase",
  lineHeight: 1,
} as const;

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    minWidth: 0,
  },
  text: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  title: {
    fontSize: "clamp(32px, 12cqi, 64px)",
    fontWeight: 340,
    lineHeight: 1.05,
    letterSpacing: "-0.8px",
    textWrap: "pretty",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  body: {
    fontSize: type.bodyLgSize,
    fontWeight: type.bodyLgWeight,
    lineHeight: 1.3,
    textWrap: "pretty",
  },
  ribbon: {
    position: "relative",
    paddingBlock: "30px 26px",
  },
  track: {
    position: "relative",
    height: 14,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceCanvas,
    overflow: "hidden",
  },
  elapsed: (width: string) => ({
    position: "absolute",
    insetBlock: 0,
    insetInlineStart: 0,
    width,
    backgroundColor: colors.actionPrimary,
  }),
  ended: (left: string, width: string) => ({
    position: "absolute",
    top: 4,
    bottom: 4,
    insetInlineStart: left,
    width,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceCanvas,
  }),
  nowLabel: (left: string, transform: string) => ({
    ...mono,
    position: "absolute",
    top: 0,
    insetInlineStart: left,
    transform,
    fontSize: 14,
    whiteSpace: "nowrap",
  }),
  sunsetIcon: (left: string) => ({
    position: "absolute",
    top: -3,
    insetInlineStart: left,
    transform: "translateX(-50%)",
    display: "flex",
  }),
  sunsetTick: (left: string) => ({
    position: "absolute",
    top: 24,
    insetInlineStart: left,
    width: 2,
    height: 26,
    marginInlineStart: -1,
    backgroundColor: colors.actionPrimary,
  }),
  marker: (left: string) => ({
    position: "absolute",
    top: 21,
    insetInlineStart: left,
    width: MARKER,
    height: MARKER,
    marginInlineStart: -MARKER / 2,
    borderRadius: radii.full,
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
    boxShadow: `0 0 0 4px ${colors.surfaceCanvas}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }),
  edge: {
    ...mono,
    position: "absolute",
    bottom: 0,
    fontSize: 13,
  },
  start: {
    insetInlineStart: 0,
  },
  end: {
    insetInlineEnd: 0,
  },
});

export function OpenDay({ hero, ribbon, now, clock, tz }: OpenDayProps) {
  const until = formatHour(RIBBON_END, clock);

  const wrapped = hero.kind === "ended";

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.text)}>
        <Eyebrow>{copy.today.open.eyebrow}</Eyebrow>
        <span {...stylex.props(styles.title)}>
          {wrapped ? copy.today.open.wrapTitle : copy.today.open.wideTitle}
        </span>
        <span {...stylex.props(styles.body)}>
          {wrapped
            ? copy.today.open.wrapBody(hero.done, until)
            : copy.today.open.wideBody(until, leftText(ribbon.left))}
        </span>
      </div>
      <Ribbon ribbon={ribbon} now={now} clock={clock} tz={tz} />
    </div>
  );
}

function Ribbon({ ribbon, now, clock, tz }: Pick<OpenDayProps, "ribbon" | "now" | "clock" | "tz">) {
  const elapsed = percentText(ribbon.elapsed);

  return (
    <div aria-hidden="true" {...stylex.props(styles.ribbon)}>
      <span {...stylex.props(styles.nowLabel(elapsed, LABEL_SHIFT[ribbon.label]))}>
        {copy.today.open.now(formatClock(minutesOfDay(now, tz), clock))}
      </span>
      {ribbon.sunset !== undefined && (
        <>
          <span {...stylex.props(styles.sunsetIcon(percentText(ribbon.sunset)))}>
            <Icon icon={Sunset} size={18} />
          </span>
          <div {...stylex.props(styles.sunsetTick(percentText(ribbon.sunset)))} />
        </>
      )}
      <div {...stylex.props(styles.track)}>
        <div {...stylex.props(styles.elapsed(elapsed))} />
        {ribbon.ended.map(({ start, width }) => (
          <div
            key={start}
            {...stylex.props(styles.ended(percentText(start), percentText(width)))}
          />
        ))}
      </div>
      <div {...stylex.props(styles.marker(elapsed))}>
        <Icon icon={Clock} size={20} strokeWidth={2} />
      </div>
      <span {...stylex.props(styles.edge, styles.start)}>{formatHour(RIBBON_START, clock)}</span>
      <span {...stylex.props(styles.edge, styles.end)}>{formatHour(RIBBON_END, clock)}</span>
    </div>
  );
}

function leftText(minutes: number): string | undefined {
  return minutes > 0 ? formatDuration(minutes) : undefined;
}

function percentText(value: number): string {
  return `${value}%`;
}
