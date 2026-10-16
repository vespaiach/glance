import * as stylex from "@stylexjs/stylex";
import { copy } from "@/copy";
import type { CalendarEvent } from "@/domain/schemas";
import { type Clock, clockAt, minutesOfDay, timeParts } from "@/domain/time";
import type { TodayHero } from "@/domain/todayHero";
import { radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { press } from "@/ui/press";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";

type HeroSummaryProps = {
  hero: TodayHero<CalendarEvent>;
  clock: Clock;
  tz: string;
  onOpenEvent: (id: string) => void;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
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
  title: {
    fontSize: type.displayLgSize,
    fontWeight: type.displayLgWeight,
    lineHeight: 1.05,
    letterSpacing: "-0.8px",
    textWrap: "pretty",
  },
  skeleton: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  body: {
    fontSize: type.bodyLgSize,
    fontWeight: type.bodyLgWeight,
    textWrap: "pretty",
  },
});

const timeAt = (iso: string, clock: Clock, tz: string) =>
  timeParts(minutesOfDay(new Date(iso), tz), clock).time;

function runningMeta({ startAt, endAt }: CalendarEvent, clock: Clock, tz: string): string {
  if (endAt === undefined) return copy.today.hero.started(clockAt(startAt, clock, tz));

  return copy.today.hero.until(timeAt(endAt, clock, tz));
}

function eventMeta(
  hero: Extract<TodayHero<CalendarEvent>, { event: unknown }>,
  clock: Clock,
  tz: string,
) {
  const when =
    hero.kind === "now"
      ? runningMeta(hero.event, clock, tz)
      : clockAt(hero.event.startAt, clock, tz);

  return [hero.event.location, when].filter(Boolean).join(" · ");
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

export function HeroSummary({ hero, clock, tz, onOpenEvent }: HeroSummaryProps) {
  if (hero.kind === "ended") {
    return <HeroMessage title={copy.today.hero.endedTitle} body={copy.today.hero.endedBody} />;
  }

  if (hero.kind === "none") {
    return <HeroMessage title={copy.today.hero.noneTitle} body={copy.today.hero.noneBody} />;
  }

  return (
    <button
      type="button"
      onClick={() => onOpenEvent(hero.event.id)}
      {...stylex.props(styles.root, styles.button, press.scale)}
    >
      <Eyebrow>{hero.kind === "now" ? copy.today.hero.now : copy.today.hero.next}</Eyebrow>
      <span {...stylex.props(styles.title)}>{hero.event.title}</span>
      <span {...stylex.props(styles.body)}>{eventMeta(hero, clock, tz)}</span>
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
