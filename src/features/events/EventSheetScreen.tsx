"use client";

import { useState } from "react";
import { useEvent, useEventsRepo, useTags } from "@/data/repos";
import { eventDayKey } from "@/domain/allDay";
import { type DetailsStatus, detailsStatus } from "@/domain/eventStatus";
import type { EventTimes } from "@/domain/eventTimes";
import { uuidv7 } from "@/domain/id";
import type { CalendarEvent } from "@/domain/schemas";
import type { EventWho } from "@/domain/tags";
import { formatDayTitle } from "@/domain/time";
import { parseDateKey } from "@/domain/zone";
import { useBreakpoint } from "@/shell/breakpoint";
import { useKeyboardInset } from "@/shell/keyboard";
import { useNetwork } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { type TimeFixture, useSheetHost } from "@/shell/SheetHost";
import { EventSheet } from "./components/EventSheet";
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
  initial: EventSheetState;
  status?: DetailsStatus;
  onDelete: () => void;
};

type Fixtures = { time?: TimeFixture; discard?: true; edit?: true };

type NewProps = Fixtures & { day: string; who?: EventWho; times?: EventTimes };

type EditProps = Fixtures & { event: CalendarEvent };

export function EventSheetScreen() {
  const { sheet } = useSheetHost();

  if (sheet?.kind === "event")
    return (
      <LoadedEventSheet
        key={sheet.id}
        id={sheet.id}
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
        times={sheet.times}
        time={sheet.time}
        discard={sheet.discard}
      />
    );

  return null;
}

function SheetFrame({ mode, day, id, initial, status, onDelete }: SheetFrameProps) {
  const { close } = useSheetHost();

  const events = useEventsRepo();

  const { clock } = useAccountSettings();

  const tz = useTimeZone();

  const { online } = useNetwork();

  const breakpoint = useBreakpoint();

  const tags = useTags() ?? [];

  const onSave = (draft: EventDraft) => {
    void events.put(eventFromDraft(draft, day, id, tz));
  };

  return (
    <EventSheet
      mode={mode}
      eyebrow={formatDayTitle(parseDateKey(day), "UTC")}
      initial={initial}
      clock={clock}
      tags={tags}
      offline={!online}
      status={status}
      compact={breakpoint === "phone"}
      onClose={close}
      onDelete={onDelete}
      onSave={onSave}
      keyboardInset={useKeyboardInset()}
    />
  );
}

function EditEventSheet({ event, time, discard, edit }: EditProps) {
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
      initial={initialEventSheet(
        draftFromEvent(event, tz, now),
        time,
        discard && !ended,
        !edit || ended,
      )}
      status={status}
      onDelete={onDelete}
    />
  );
}

function LoadedEventSheet({ id, ...fixtures }: Fixtures & { id: string }) {
  const event = useEvent(id);

  return event ? <EditEventSheet event={event} {...fixtures} /> : null;
}

function NewEventSheet({ day, who, times, time, discard }: NewProps) {
  const now = useNow("minute");

  const tz = useTimeZone();

  const [id] = useState(() => uuidv7(now));

  return (
    <SheetFrame
      mode="new"
      day={day}
      id={id}
      initial={initialEventSheet(newEventDraft(now, tz, who, times), time, discard)}
      onDelete={() => {}}
    />
  );
}
