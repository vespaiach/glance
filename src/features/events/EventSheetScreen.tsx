"use client";

import { useEvent, useEventsRepo } from "@/data/repos";
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
  type EventSheetState,
  eventSwatches,
  initialEventSheet,
  newEventDraft,
} from "./eventSheet";

type SheetFrameProps = {
  mode: "new" | "edit";
  day: Date;
  initial: EventSheetState;
  onDelete: () => void;
};

function SheetFrame({ mode, day, initial, onDelete }: SheetFrameProps) {
  const { close } = useSheetHost();

  const { clock } = useAccountSettings();

  const season = useSeason();

  const { online } = useNetwork();

  const breakpoint = useBreakpoint();

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

  return (
    <SheetFrame
      mode="new"
      day={parseLocalDate(day)}
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
