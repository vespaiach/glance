import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import { whoLabel } from "@/domain/members";
import type { CalendarEvent, Member } from "@/domain/schemas";
import { type Clock, clockAt, formatDuration, minutesOfDay, timeParts } from "@/domain/time";
import type { TodayHero } from "@/domain/todayHero";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { press } from "@/ui/press";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { CueEyebrow } from "./CueEyebrow";

type HeroSummaryProps = {
  hero: TodayHero<CalendarEvent>;
  members: readonly Member[];
  clock: Clock;
  tz: string;
  onOpenEvent: (id: string) => void;
};

type EventHero = Extract<TodayHero<CalendarEvent>, { event: unknown }>;

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
    fontSize: "clamp(28px, 8cqi, 48px)",
    fontWeight: 340,
    lineHeight: 1.05,
    letterSpacing: "-0.8px",
    textWrap: "pretty",
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

export function HeroSummary({ hero, members, clock, tz, onOpenEvent }: HeroSummaryProps) {
  if (hero.kind === "ended") {
    return <HeroMessage title={copy.today.hero.endedTitle} body={copy.today.hero.endedBody} />;
  }

  if (hero.kind === "none") {
    return <HeroMessage title={copy.today.hero.noneTitle} body={copy.today.hero.noneBody} />;
  }

  const countdown = countdownText(hero);

  return (
    <button
      type="button"
      onClick={() => onOpenEvent(hero.event.id)}
      {...stylex.props(styles.root, styles.button, press.scale)}
    >
      <span {...stylex.props(styles.eyebrow)}>
        <CueEyebrow>{hero.kind === "now" ? copy.today.hero.now : copy.today.hero.next}</CueEyebrow>
        {countdown && <span {...stylex.props(styles.pill)}>{countdown}</span>}
      </span>
      <span {...stylex.props(styles.title)}>{hero.event.title}</span>
      <span {...stylex.props(styles.body)}>{eventMeta(hero, members, clock, tz)}</span>
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

function eventMeta(hero: EventHero, members: readonly Member[], clock: Clock, tz: string) {
  const when =
    hero.kind === "now"
      ? runningMeta(hero.event, clock, tz)
      : clockAt(hero.event.startAt, clock, tz);

  const who = whoLabel(hero.event, members, copy.events.everyone);

  return [hero.event.location, when, who].filter(Boolean).join(" · ");
}

function HeroMessage({ title, body }: { title: string; body: string }) {
  return (
    <div {...stylex.props(styles.root)}>
      <Eyebrow>{copy.today.hero.today}</Eyebrow>
      <span {...stylex.props(styles.title)}>{title}</span>
      <span {...stylex.props(styles.body)}>{body}</span>
    </div>
  );
}
