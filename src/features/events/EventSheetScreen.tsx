"use client";

import { useState } from "react";
import { useEvent, useEventsRepo } from "@/data/repos";
import { uuidv7 } from "@/domain/id";
import type { CalendarEvent } from "@/domain/schemas";
import { formatDayTitle } from "@/domain/time";
import { dateKey, parseDateKey } from "@/domain/zone";
import { useBreakpoint } from "@/shell/breakpoint";
import { useKeyboardInset } from "@/shell/keyboard";
import { useNetwork } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { type TimeFixture, useSheetHost } from "@/shell/SheetHost";
import { EventSheet } from "./components/EventSheet";
import {
  draftFromEvent,
  type EventDraft,
  type EventSheetState,
  eventFromDraft,
  eventSwatches,
  initialEventSheet,
  newEventDraft,
} from "./eventSheet";

type SheetFrameProps = {
  mode: "new" | "edit";
  day: string;
  id: string;
  initial: EventSheetState;
  onDelete: () => void;
};

function SheetFrame({ mode, day, id, initial, onDelete }: SheetFrameProps) {
  const { close } = useSheetHost();

  const events = useEventsRepo();

  const { clock } = useAccountSettings();

  const tz = useTimeZone();

  const season = useSeason();

  const { online } = useNetwork();

  const breakpoint = useBreakpoint();

  const onSave = (draft: EventDraft) => {
    close();
    void events.put(eventFromDraft(draft, day, id, tz));
  };

  return (
    <EventSheet
      mode={mode}
      eyebrow={formatDayTitle(parseDateKey(day), "UTC")}
      initial={initial}
      clock={clock}
      swatches={eventSwatches(season)}
      offline={!online}
      compact={breakpoint === "phone"}
      onClose={close}
      onDelete={onDelete}
      onSave={onSave}
      keyboardInset={useKeyboardInset()}
    />
  );
}

type EditProps = { event: CalendarEvent; time?: TimeFixture };

function EditEventSheet({ event, time }: EditProps) {
  const { close } = useSheetHost();

  const events = useEventsRepo();

  const tz = useTimeZone();

  const onDelete = () => {
    close();
    void events.remove(event.id);
  };

  return (
    <SheetFrame
      mode="edit"
      day={dateKey(new Date(event.startAt), tz)}
      id={event.id}
      initial={initialEventSheet(draftFromEvent(event, tz), time)}
      onDelete={onDelete}
    />
  );
}

function LoadedEventSheet({ id, time }: { id: string; time?: TimeFixture }) {
  const event = useEvent(id);

  return event ? <EditEventSheet event={event} time={time} /> : null;
}

function NewEventSheet({ day, time }: { day: string; time?: TimeFixture }) {
  const now = useNow("minute");

  const tz = useTimeZone();

  const [id] = useState(() => uuidv7(now));

  return (
    <SheetFrame
      mode="new"
      day={day}
      id={id}
      initial={initialEventSheet(newEventDraft(now, tz), time)}
      onDelete={() => {}}
    />
  );
}

export function EventSheetScreen() {
  const { sheet } = useSheetHost();

  if (sheet?.kind === "event")
    return <LoadedEventSheet key={sheet.id} id={sheet.id} time={sheet.time} />;

  if (sheet?.kind === "newevent")
    return <NewEventSheet key={sheet.day} day={sheet.day} time={sheet.time} />;

  return null;
}
