"use client";

import { useReducer, useState } from "react";
import {
  useEvent,
  useEventRecents,
  useEventsOnDay,
  useEventsRepo,
  useTags,
  useTagsRepo,
} from "@/data/repos";
import { eventDayKey } from "@/domain/allDay";
import { sameTimeClashes } from "@/domain/dayPreview";
import { type StatusTitle, statusTitle } from "@/domain/eventStatus";
import type { EventTimes } from "@/domain/eventTimes";
import { uuidv7 } from "@/domain/id";
import { nextOccurrence } from "@/domain/repeat";
import type { CalendarEvent, Tag, TagColor } from "@/domain/schemas";
import { EVERYONE, type EventWho, whoIds } from "@/domain/tags";
import { minutesOfDay } from "@/domain/time";
import { dateKey } from "@/domain/zone";
import { useBreakpoint } from "@/shell/breakpoint";
import { useKeyboardInset } from "@/shell/keyboard";
import { useNetwork } from "@/shell/providers/network";
import { useNow, useNowStore } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { useSheetHost } from "@/shell/SheetHost";
import { EventPage } from "./components/EventPage";
import type { SameTime } from "./components/EventSentence";
import { DayPreviewPanel, EventFactsPanel } from "./DayPreviewPanel";
import { draftFromEvent, eventFromDraft, newEventDraft } from "./eventDraft";
import {
  detachedWeek,
  type EventPageState,
  eventPageReducer,
  initialEventPage,
  type OpenEventPage,
  type PageDraft,
  type SeriesScope,
  seriesDraft,
  skippedWeek,
} from "./eventPage";

type FrameProps = { id: string; initial: EventPageState; tags: readonly Tag[] };

type NewProps = { day: string; who?: EventWho; times?: EventTimes; tags: readonly Tag[] };

type LoadedProps = { id: string; edit?: true; day?: string; tags: readonly Tag[] };

type EditProps = { event: CalendarEvent; edit?: true; day?: string; tags: readonly Tag[] };

export function EventSheetScreen() {
  const { sheet } = useSheetHost();

  const tags = useTags();

  if (!tags) return null;

  if (sheet?.kind === "event")
    return (
      <LoadedEventPage key={sheet.id} id={sheet.id} edit={sheet.edit} day={sheet.day} tags={tags} />
    );

  if (sheet?.kind === "newevent")
    return (
      <NewEventPage
        key={sheet.day}
        day={sheet.day}
        who={sheet.who}
        times={sheet.times}
        tags={tags}
      />
    );

  return null;
}

function NewEventPage({ day, who = EVERYONE, times, tags }: NewProps) {
  const now = useNow("minute");

  const tz = useTimeZone();

  const [id] = useState(() => uuidv7(now));

  const draft = { ...newEventDraft(now, tz, whoIds(who, tagIds(tags)), times), day };

  return <EventPageFrame id={id} initial={initialEventPage("new", draft)} tags={tags} />;
}

function LoadedEventPage({ id, ...props }: LoadedProps) {
  const event = useEvent(id);

  return event ? <EditEventPage event={event} {...props} /> : null;
}

function EditEventPage({ event, edit, day, tags }: EditProps) {
  const now = useNow("minute");

  const tz = useTimeZone();

  const draft = {
    ...draftFromEvent(event, tz, now, tagIds(tags)),
    ...openedDays(event, day, now, tz),
  };

  const ended = statusTitle(event, now, tz).kind === "ended";

  const mode = edit && !ended ? "edit" : "view";

  return <EventPageFrame id={event.id} initial={initialEventPage(mode, draft)} tags={tags} />;
}

function EventPageFrame({ id, initial, tags }: FrameProps) {
  const { close } = useSheetHost();

  const events = useEventsRepo();

  const tagsRepo = useTagsRepo();

  const { get: currentTime } = useNowStore();

  const [state, dispatch] = useReducer(eventPageReducer, initial);

  const shown = useLastOpen(state);

  const [deleted, setDeleted] = useState<SeriesScope>();

  const draft = shown.mode === "view" ? shown.opened : shown.draft;

  const tz = useTimeZone();

  const now = useNow("minute");

  const { clock } = useAccountSettings();

  const { online } = useNetwork();

  const recents = useEventRecents();

  const sameTime = useSameTime(draft, id, tags);

  const toEvent = (page: PageDraft, eventId = id) =>
    eventFromDraft(page, page.day, eventId, tz, tagIds(tags));

  const onSave = (scope?: SeriesScope) => {
    if (shown.mode === "view") return;

    if (scope === "one") {
      void events.put(toEvent(skippedWeek(shown.opened)));
      void events.put(toEvent(detachedWeek(shown.draft), uuidv7(currentTime())));
    } else void events.put(toEvent(seriesDraft(shown)));

    dispatch({ type: "saved", scope });
  };

  const onDelete = (scope: SeriesScope = "all") => {
    setDeleted(scope);

    dispatch({ type: "deleted" });
  };

  const onLeft = () => {
    close();

    if (deleted === "all") void events.remove(id);

    if (deleted === "one" && shown.mode !== "view")
      void events.put(toEvent(skippedWeek(shown.opened)));
  };

  const onCreateTag = (name: string, color: TagColor) => {
    const created = currentTime();

    const tag = { id: uuidv7(created), name, color, createdAt: created.toISOString() };

    void tagsRepo.add(tag);

    return tag.id;
  };

  const breakpoint = useBreakpoint();

  return (
    <EventPage
      breakpoint={breakpoint}
      state={shown}
      leaving={state.mode === "closed"}
      tags={tags}
      clock={clock}
      today={dateKey(now, tz)}
      online={online}
      status={pageStatus(shown, id, tz, now, tags)}
      sameTime={sameTime}
      recentTitles={recents?.titles ?? []}
      recentPlaces={recents?.places ?? []}
      preview={<DayPreviewPanel day={draft.day} id={id} tags={tags} times={draft} />}
      facts={
        <EventFactsPanel
          breakpoint={breakpoint}
          day={draft.day}
          id={id}
          tags={tags}
          times={draft}
        />
      }
      keyboardInset={useKeyboardInset()}
      dispatch={dispatch}
      onSave={onSave}
      onDelete={onDelete}
      onLeft={onLeft}
      onCreateTag={onCreateTag}
    />
  );
}

function openedDays(event: CalendarEvent, day: string | undefined, now: Date, tz: string) {
  if (event.repeat !== "weekly") return { day: eventDayKey(event, tz) };

  const firstDay = eventDayKey(event, tz);

  const next = nextOccurrence(event, dateKey(now, tz), tz) ?? event;

  return { day: day ?? eventDayKey(next, tz), firstDay };
}

function useLastOpen(state: EventPageState): OpenEventPage {
  const [shown, setShown] = useState(state as OpenEventPage);

  if (state.mode !== "closed" && state !== shown) setShown(state);

  return state.mode === "closed" ? shown : state;
}

function useSameTime(draft: PageDraft, id: string, tags: readonly Tag[]): SameTime | undefined {
  const tz = useTimeZone();

  const events = useEventsOnDay(draft.day, tz) ?? [];

  const [first, ...more] = sameTimeClashes(
    events,
    { id, day: draft.day, times: draft, tagIds: draft.tagIds },
    { allIds: tagIds(tags), tz },
  );

  if (!first) return undefined;

  const start = minutesOfDay(new Date(first.event.startAt), tz);

  const end = first.event.endAt ? minutesOfDay(new Date(first.event.endAt), tz) : start;

  return { tagIds: first.tagIds, title: first.event.title, start, end, more: more.length };
}

function pageStatus(
  state: OpenEventPage,
  id: string,
  tz: string,
  now: Date,
  tags: readonly Tag[],
): StatusTitle | undefined {
  if (state.mode !== "view") return undefined;

  return statusTitle(eventFromDraft(state.opened, state.opened.day, id, tz, tagIds(tags)), now, tz);
}

function tagIds(tags: readonly Tag[]): string[] {
  return tags.map((tag) => tag.id);
}
