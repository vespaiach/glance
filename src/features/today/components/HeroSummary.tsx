import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import type { CalendarEvent, Tag } from "@/domain/schemas";
import { whoLabel } from "@/domain/tags";
import { type Clock, clockAt, formatDuration, minutesOfDay, timeParts } from "@/domain/time";
import type { TodayHero } from "@/domain/todayHero";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { press } from "@/ui/press";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { CueEyebrow } from "./CueEyebrow";

type EventHero = Extract<TodayHero<CalendarEvent>, { event: unknown }>;

type HeroSummaryProps = {
  hero: EventHero;
  tags: readonly Tag[];
  clock: Clock;
  tz: string;
  onOpenEvent: (event: CalendarEvent) => void;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minWidth: 0,
  },
  button: {
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
    textAlign: "start",
    font: "inherit",
    color: "inherit",
    cursor: "pointer",
  },
  eyebrow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  pill: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
    borderRadius: radii.full,
    paddingBlock: 4,
    paddingInline: 12,
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
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
  skeleton: {
    display: "flex",
    flexDirection: "column",
    gap: space.md,
  },
  body: {
    fontSize: type.bodyLgSize,
    fontWeight: type.bodyLgWeight,
    lineHeight: 1.3,
    textWrap: "pretty",
  },
});

const timeAt = (iso: string, clock: Clock, tz: string) =>
  timeParts(minutesOfDay(new Date(iso), tz), clock).time;

export function HeroSummary({ hero, tags, clock, tz, onOpenEvent }: HeroSummaryProps) {
  const countdown = countdownText(hero);

  return (
    <button
      type="button"
      onClick={() => onOpenEvent(hero.event)}
      {...stylex.props(styles.root, styles.button, press.scale)}
    >
      <span {...stylex.props(styles.eyebrow)}>
        <CueEyebrow>{hero.kind === "now" ? copy.today.hero.now : copy.today.hero.next}</CueEyebrow>
        {countdown && <span {...stylex.props(styles.pill)}>{countdown}</span>}
      </span>
      <span {...stylex.props(styles.title)}>{hero.event.title}</span>
      <span {...stylex.props(styles.body)}>{eventMeta(hero, tags, clock, tz)}</span>
    </button>
  );
}

export function HeroSkeleton() {
  return (
    <Skeleton label={copy.today.hero.loading} xstyle={styles.skeleton}>
      <SkeletonBlock width={140} height={14} />
      <SkeletonBlock width="80%" height={40} radius={radii.md} />
      <SkeletonBlock width="50%" height={18} />
    </Skeleton>
  );
}

function countdownText(hero: EventHero): string | undefined {
  if (hero.kind === "next") return copy.today.hero.in(formatDuration(hero.in));

  return hero.left === undefined ? undefined : copy.today.hero.left(formatDuration(hero.left));
}

function runningMeta({ startAt, endAt }: CalendarEvent, clock: Clock, tz: string): string {
  if (endAt === undefined) return copy.today.hero.started(clockAt(startAt, clock, tz));

  return copy.today.hero.until(timeAt(endAt, clock, tz));
}

function eventMeta(hero: EventHero, tags: readonly Tag[], clock: Clock, tz: string) {
  const when =
    hero.kind === "now"
      ? runningMeta(hero.event, clock, tz)
      : clockAt(hero.event.startAt, clock, tz);

  const who = whoLabel(hero.event, tags, copy.events.everyone);

  return [hero.event.location, when, who].filter(Boolean).join(" · ");
}
