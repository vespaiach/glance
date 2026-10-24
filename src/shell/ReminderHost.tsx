"use client";

import * as stylex from "@stylexjs/stylex";
import { type RefObject, useEffect, useEffectEvent, useRef, useState } from "react";
import { copy } from "@/copy";
import { useEventsBetween, useTags } from "@/data/repos";
import { inAmbient } from "@/domain/idle";
import { minutesLeft, type ReminderGroup, remindersDue } from "@/domain/reminders";
import type { CalendarEvent, Tag } from "@/domain/schemas";
import { eventColor, whoLabel } from "@/domain/tags";
import { type Clock, clockAt } from "@/domain/time";
import { addDays, dateKey } from "@/domain/zone";
import { motion, sizes } from "@/theme/tokens.stylex";
import { ReminderStrip } from "@/ui/ReminderStrip";
import { armChime, playChime } from "./chime";
import { useNow } from "./providers/now";
import { useAccountSettings } from "./providers/settings";
import { useTimeZone } from "./providers/timeZone";
import { viewPath } from "./routes";
import { useSheetHost } from "./SheetHost";
import { useAmbientNavigate } from "./useAmbientNavigate";

type ReminderHostProps = { chime?: () => void };

type Showing = { group: ReminderGroup<CalendarEvent>; shownAt: number };

type StripText = Pick<
  Parameters<typeof ReminderStrip>[0],
  "atStart" | "color" | "eyebrow" | "title" | "actionLabel"
>;

const SHOW_MS = 30_000;

const OWN_EVENTS = ["pointerdown", "wheel"] as const;

const words = copy.reminder.strip;

const slideIn = stylex.keyframes({
  from: { opacity: 0, transform: "translateY(-16px)" },
  to: { opacity: 1, transform: "none" },
});

const fadeOut = stylex.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0 },
});

const styles = stylex.create({
  layer: {
    position: "fixed",
    top: 24,
    insetInline: sizes.kioskGutter,
    zIndex: 30,
    display: "flex",
    justifyContent: "center",
    pointerEvents: "none",
    animationName: fadeOut,
    animationDuration: motion.durBase,
    animationDelay: "29720ms",
    animationFillMode: "forwards",
  },
  strip: {
    pointerEvents: "auto",
    animationName: slideIn,
    animationDuration: motion.durBase,
    animationTimingFunction: motion.easeOut,
  },
});

export function ReminderHost({ chime = playChime }: ReminderHostProps) {
  const now = useNow("second");

  const tz = useTimeZone();

  const { ambient, chime: chimeOn, clock } = useAccountSettings();

  const today = dateKey(now, tz);

  const events = useEventsBetween(today, addDays(today, 2), tz);

  const tags = useTags() ?? [];

  const { open } = useSheetHost();

  const navigate = useAmbientNavigate();

  const layer = useRef<HTMLDivElement>(null);

  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());

  const [showing, setShowing] = useState<Showing | null>(null);

  const quiet = inAmbient(ambient, now, tz);

  const due = events ? remindersDue(events, now, seen) : [];

  const latest = due.at(-1);

  if (latest) {
    setSeen(new Set([...seen, ...due.flatMap((group) => group.keys)]));

    if (!quiet) setShowing({ group: latest, shownAt: now.getTime() });
  }

  useChimeOnShow(showing?.shownAt, () => chimeOn && chime());

  useOwnTouches(layer);

  useEffect(() => armChime(), []);

  const left = showing ? 1 - (now.getTime() - showing.shownAt) / SHOW_MS : 0;

  if (showing === null || quiet || left <= 0) return null;

  const { group } = showing;

  const onOpen = () => {
    setShowing(null);

    const [only, ...others] = group.events;

    if (only && others.length === 0) open({ kind: "event", id: only.id });
    else navigate(viewPath("today"));
  };

  return (
    <div key={showing.shownAt} ref={layer} {...stylex.props(styles.layer)}>
      <ReminderStrip
        {...stripText(group, now, clock, tz, tags)}
        label={words.label}
        left={left}
        onOpen={onOpen}
        xstyle={styles.strip}
      />
    </div>
  );
}

function useChimeOnShow(shownAt: number | undefined, play: () => void) {
  const ring = useEffectEvent(play);

  useEffect(() => {
    if (shownAt !== undefined) ring();
  }, [shownAt]);
}

function useOwnTouches(layer: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const keep = (event: Event) => {
      if (layer.current?.contains(event.target as Node)) event.stopPropagation();
    };

    for (const type of OWN_EVENTS) window.addEventListener(type, keep, true);

    return () => {
      for (const type of OWN_EVENTS) window.removeEventListener(type, keep, true);
    };
  }, [layer]);
}

function stripText(
  group: ReminderGroup<CalendarEvent>,
  now: Date,
  clock: Clock,
  tz: string,
  tags: readonly Tag[],
): StripText {
  const atStart = group.kind === "start";

  const start = clockAt(group.startAt, clock, tz);

  const when = atStart ? words.now : words.in(minutesLeft(group, now));

  const [only, ...others] = group.events;

  if (only === undefined || others.length > 0) {
    return {
      atStart,
      color: "soft",
      eyebrow: words.eyebrow([when, start, words.count(group.events.length)]),
      title: words.titles(group.titles, group.more),
      actionLabel: words.seeAll,
    };
  }

  const time = atStart && only.endAt ? words.span(start, clockAt(only.endAt, clock, tz)) : start;

  const who = atStart ? undefined : whoLabel(only, tags, copy.events.everyone);

  return {
    atStart,
    color: eventColor(only, tags),
    eyebrow: words.eyebrow([when, time, who, only.location]),
    title: only.title,
    actionLabel: words.details,
  };
}
