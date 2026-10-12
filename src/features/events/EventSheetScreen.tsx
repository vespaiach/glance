"use client";

import { useState } from "react";
import { useEvent, useEventsRepo } from "@/data/repos";
import { uuidv7 } from "@/domain/id";
import type { CalendarEvent } from "@/domain/schemas";
import { formatDayTitle, parseLocalDate } from "@/domain/time";
import { useBreakpoint } from "@/shell/breakpoint";
import { useNetwork } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
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
  day: Date;
  id: string;
  initial: EventSheetState;
  onDelete: () => void;
};

function SheetFrame({ mode, day, id, initial, onDelete }: SheetFrameProps) {
  const { close } = useSheetHost();

  const events = useEventsRepo();

  const { clock } = useAccountSettings();

  const season = useSeason();

  const { online } = useNetwork();

  const breakpoint = useBreakpoint();

  const onSave = (draft: EventDraft) => {
    close();
    void events.put(eventFromDraft(draft, day, id));
  };

  return (
    <EventSheet
      mode={mode}
      eyebrow={formatDayTitle(day)}
      initial={initial}
      clock={clock}
      swatches={eventSwatches(season)}
      offline={!online}
      compact={breakpoint === "phone"}
      onClose={close}
      onDelete={onDelete}
      onSave={onSave}
    />
  );
}

type EditProps = { event: CalendarEvent; time?: TimeFixture };

function EditEventSheet({ event, time }: EditProps) {
  const { close } = useSheetHost();

  const events = useEventsRepo();

  const onDelete = () => {
    close();
    void events.remove(event.id);
  };

  return (
    <SheetFrame
      mode="edit"
      day={new Date(event.startAt)}
      id={event.id}
      initial={initialEventSheet(draftFromEvent(event), time)}
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

  const [id] = useState(() => uuidv7(now));

  return (
    <SheetFrame
      mode="new"
      day={parseLocalDate(day)}
      id={id}
      initial={initialEventSheet(newEventDraft(now), time)}
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
