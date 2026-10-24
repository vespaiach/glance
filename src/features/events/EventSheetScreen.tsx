"use client";

import { useState } from "react";
import { copy } from "@/copy";
import { useEvent, useEventsRepo, useTags, useTagsRepo, useWeather } from "@/data/repos";
import { eventDayKey } from "@/domain/allDay";
import { type DetailsStatus, detailsStatus } from "@/domain/eventStatus";
import type { EventTimes } from "@/domain/eventTimes";
import { uuidv7 } from "@/domain/id";
import type { CalendarEvent, Tag, TagColor } from "@/domain/schemas";
import { EVERYONE, type EventWho, whoIds } from "@/domain/tags";
import { displayTemp } from "@/domain/temperature";
import { formatDayTitle } from "@/domain/time";
import { dayForecast } from "@/domain/weather";
import { dateKey, parseDateKey } from "@/domain/zone";
import { useBackgroundPhoto } from "@/shell/background";
import { useBreakpoint } from "@/shell/breakpoint";
import { useKeyboardInset } from "@/shell/keyboard";
import { useNetwork } from "@/shell/providers/network";
import { useNow, useNowStore } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { type TimeFixture, useSheetHost } from "@/shell/SheetHost";
import { photoLayer } from "@/ui/photoLayer";
import { EventSheet, type SheetForecast } from "./components/EventSheet";
import { DayPreviewPanel } from "./DayPreviewPanel";
import {
  draftFromEvent,
  type EventDraft,
  type EventSheetState,
  eventFromDraft,
  initialEventSheet,
  newEventDraft,
} from "./eventSheet";

type SheetFrameProps = {
  mode: "new" | "edit";
  day: string;
  id: string;
  tags: readonly Tag[];
  initial: EventSheetState;
  status?: DetailsStatus;
  onDelete: () => void;
};

type Fixtures = { time?: TimeFixture; discard?: true; edit?: true };

type NewProps = Fixtures & {
  day: string;
  who?: EventWho;
  times?: EventTimes;
  tags: readonly Tag[];
};

type EditProps = Fixtures & { event: CalendarEvent; tags: readonly Tag[] };

export function EventSheetScreen() {
  const { sheet } = useSheetHost();

  const tags = useTags();

  if (!tags) return null;

  if (sheet?.kind === "event")
    return (
      <LoadedEventSheet
        key={sheet.id}
        id={sheet.id}
        tags={tags}
        time={sheet.time}
        discard={sheet.discard}
        edit={sheet.edit}
      />
    );

  if (sheet?.kind === "newevent")
    return (
      <NewEventSheet
        key={sheet.day}
        day={sheet.day}
        who={sheet.who}
        tags={tags}
        times={sheet.times}
        time={sheet.time}
        discard={sheet.discard}
      />
    );

  return null;
}

function SheetFrame({ mode, day, id, tags, initial, status, onDelete }: SheetFrameProps) {
  const { close } = useSheetHost();

  const events = useEventsRepo();

  const { clock } = useAccountSettings();

  const tz = useTimeZone();

  const { online } = useNetwork();

  const breakpoint = useBreakpoint();

  const tagsRepo = useTagsRepo();

  const { get: currentTime } = useNowStore();

  const [saved, setSaved] = useState(day);

  const [chosen, setChosen] = useState(day);

  const today = dateKey(useNow("minute"), tz);

  const photo = useBackgroundPhoto();

  const onSave = (draft: EventDraft) => {
    void events.put(eventFromDraft(draft, chosen, id, tz, tagIds(tags)));

    setSaved(chosen);
  };

  const onCreateTag = (name: string, color: TagColor) => {
    const now = currentTime();

    const tag = { id: uuidv7(now), name, color, createdAt: now.toISOString() };

    void tagsRepo.add(tag);

    return tag.id;
  };

  return (
    <EventSheet
      mode={mode}
      eyebrow={formatDayTitle(parseDateKey(chosen), "UTC")}
      forecast={useDayForecast(chosen)}
      date={{ day: chosen, saved, today, onChange: setChosen }}
      initial={initial}
      clock={clock}
      tags={tags}
      offline={!online}
      status={status}
      compact={breakpoint === "small"}
      onClose={close}
      onDelete={onDelete}
      onSave={onSave}
      onCreateTag={onCreateTag}
      keyboardInset={useKeyboardInset()}
      backdrop={photo && photoLayer(photo.dim, photo.src)}
      preview={(draft) => <DayPreviewPanel day={chosen} id={id} tags={tags} times={draft} />}
    />
  );
}

function EditEventSheet({ event, tags, time, discard, edit }: EditProps) {
  const { close } = useSheetHost();

  const events = useEventsRepo();

  const tz = useTimeZone();

  const now = useNow("minute");

  const status = detailsStatus(event, now, tz);

  const ended = status === "ended";

  const onDelete = () => {
    close();
    void events.remove(event.id);
  };

  return (
    <SheetFrame
      mode="edit"
      day={eventDayKey(event, tz)}
      id={event.id}
      tags={tags}
      initial={initialEventSheet(
        draftFromEvent(event, tz, now, tagIds(tags)),
        time,
        discard && !ended,
        !edit || ended,
      )}
      status={status}
      onDelete={onDelete}
    />
  );
}

function LoadedEventSheet({ id, ...props }: Fixtures & { id: string; tags: readonly Tag[] }) {
  const event = useEvent(id);

  return event ? <EditEventSheet event={event} {...props} /> : null;
}

function NewEventSheet({ day, who = EVERYONE, times, tags, time, discard }: NewProps) {
  const now = useNow("minute");

  const tz = useTimeZone();

  const { defaultReminder } = useAccountSettings();

  const [id] = useState(() => uuidv7(now));

  return (
    <SheetFrame
      mode="new"
      day={day}
      id={id}
      tags={tags}
      initial={initialEventSheet(
        newEventDraft(now, tz, whoIds(who, tagIds(tags)), defaultReminder, times),
        time,
        discard,
      )}
      onDelete={() => {}}
    />
  );
}

function useDayForecast(day: string): SheetForecast | undefined {
  const weather = useWeather();

  const { weatherLocation, tempUnit } = useAccountSettings();

  const now = useNow("minute");

  const tz = useTimeZone();

  const point = weather && weatherLocation ? dayForecast(weather.daily, day, now, tz) : undefined;

  if (!point) return undefined;

  return {
    icon: point.icon,
    label: copy.weather.icon[point.icon],
    high: `${displayTemp(point.high, tempUnit)}°`,
  };
}

function tagIds(tags: readonly Tag[]): string[] {
  return tags.map((tag) => tag.id);
}
