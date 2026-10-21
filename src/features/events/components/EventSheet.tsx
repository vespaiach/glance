"use client";

import * as stylex from "@stylexjs/stylex";
import { Check, Pencil, Trash2, WifiOff } from "lucide-react";
import { type ReactNode, useEffect, useReducer, useRef, useState } from "react";
import { copy } from "@/copy";
import type { DetailsStatus } from "@/domain/eventStatus";
import type { Tag, TagColor, WeatherIcon } from "@/domain/schemas";
import { nextFreeColor } from "@/domain/tags";
import type { Clock } from "@/domain/time";
import { shadows } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { DiscardButtons, DiscardMessage } from "@/ui/DiscardPrompt";
import { type CloseFrom, closeStep } from "@/ui/discard";
import { Icon } from "@/ui/Icon";
import { Page } from "@/ui/Page";
import { Switch } from "@/ui/Switch";
import { TextInput } from "@/ui/TextInput";
import { TimeField } from "@/ui/TimeField";
import { TimePicker } from "@/ui/TimePicker";
import { weatherIcons } from "@/ui/weatherIcons";
import {
  canSave,
  type EventDraft,
  type EventEditState,
  type EventSheetAction,
  type EventSheetState,
  eventSheetReducer,
  isDirty,
  type TimeFieldName,
} from "../eventSheet";
import { EventDetails } from "./EventDetails";
import { QuickDate } from "./QuickDate";
import { WhoField } from "./WhoField";

export type SheetForecast = { icon: WeatherIcon; label: string; high: string };

export type SheetDate = {
  day: string;
  today: string;
  saved: string;
  onChange: (day: string) => void;
};

type EventSheetProps = {
  mode: "new" | "edit";
  eyebrow: string;
  forecast?: SheetForecast;
  date?: SheetDate;
  initial: EventSheetState;
  clock: Clock;
  tags: readonly Tag[];
  offline: boolean;
  status?: DetailsStatus;
  compact?: boolean;
  keyboardInset?: number;
  preview?: (draft: EventDraft) => ReactNode;
  onClose: () => void;
  onDelete: () => void;
  onSave: (draft: EventDraft) => void;
  onCreateTag: (name: string, color: TagColor) => string;
};

const words = copy.events.sheet;

const discard = copy.discard;

const time = copy.events.time;

const details = copy.events.details;

const styles = stylex.create({
  forecast: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    whiteSpace: "nowrap",
  },
  times: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  fields: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
  },
  delete: {
    marginLeft: -12,
  },
  cancel: {
    boxShadow: shadows.shadow1,
  },
  ended: {
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    fontSize: type.bodySize,
    fontWeight: type.bodyLgWeight,
    lineHeight: 1.4,
  },
});

const REVEAL_GAP = 16;

type TimesProps = {
  state: EventEditState;
  clock: Clock;
  compact?: boolean;
  dispatch: (action: EventSheetAction) => void;
};

type DetailsPageProps = {
  eyebrow: ReactNode;
  draft: EventDraft;
  tags: readonly Tag[];
  clock: Clock;
  status: DetailsStatus;
  compact?: boolean;
  keyboardInset?: number;
  aside?: ReactNode;
  leaving: (() => void) | null;
  onClose: () => void;
  onEdit: () => void;
};

type DayEyebrowProps = {
  day: string;
  forecast?: SheetForecast;
  date?: SheetDate;
  onOpenDate: () => void;
};

type DeleteActionProps = {
  confirming: boolean;
  compact?: boolean;
  onAsk: () => void;
  onDelete: () => void;
};

export function EventSheet({
  mode,
  eyebrow,
  forecast,
  date,
  initial,
  clock,
  tags,
  offline,
  status = null,
  compact,
  preview,
  onClose,
  onDelete,
  onSave,
  onCreateTag,
  keyboardInset,
}: EventSheetProps) {
  const [state, dispatch] = useReducer(eventSheetReducer, initial);

  const [leaving, setLeaving] = useState<(() => void) | null>(null);

  const leave = (then: () => void) => setLeaving(() => then);

  const heading = (editable: boolean) => (
    <DayEyebrow
      day={eyebrow}
      forecast={forecast}
      date={editable ? date : undefined}
      onOpenDate={() => dispatch({ type: "done" })}
    />
  );

  if (state.step === "details")
    return detailsPage({
      eyebrow: heading(false),
      draft: state.opened,
      tags,
      clock,
      status,
      compact,
      keyboardInset,
      aside: preview?.(state.opened),
      leaving,
      onClose: () => leave(onClose),
      onEdit: () => dispatch({ type: "edit" }),
    });

  const { draft } = state;

  const asking = state.step === "discarding";

  const dirty = isDirty(draft, state.opened) || (date !== undefined && date.day !== date.saved);

  const save = () => {
    if (!canSave(draft)) return dispatch({ type: "save" });

    onSave(draft);

    if (state.fromDetails) dispatch({ type: "saved" });
    else leave(onClose);
  };

  const requestClose = (from: CloseFrom) => () => {
    const step = closeStep(asking, dirty, from);

    if (step === "close") return leave(onClose);

    if (step === "ask") dispatch({ type: "askDiscard" });
  };

  const cancel = () => {
    if (!state.fromDetails) return requestClose("button")();

    const step = closeStep(asking, dirty, "button");

    if (step === "ask") return dispatch({ type: "askDiscard", to: "details" });

    backToDetails();
  };

  const newColor = state.newColor ?? nextFreeColor(tags);

  const createTag = () => {
    const id = onCreateTag(state.whoInput.trim(), newColor);

    dispatch({ type: "addTag", id });
  };

  const backToDetails = () => {
    if (date) date.onChange(date.saved);

    dispatch({ type: "back" });
  };

  const discardChanges = () =>
    asking && state.discardTo === "details" ? backToDetails() : leave(onClose);

  const endActions = (
    <>
      <Button variant="secondary" onClick={cancel} xstyle={styles.cancel}>
        {words.cancel}
      </Button>
      <Button icon={Check} onClick={save}>
        {primaryLabel(mode, offline)}
      </Button>
    </>
  );

  const startActions = mode === "edit" && (
    <DeleteAction
      confirming={state.step === "deleting"}
      compact={compact}
      onAsk={() => dispatch({ type: "askDelete" })}
      onDelete={() => leave(onDelete)}
    />
  );

  const discardBody = mode === "new" ? discard.newEvent : discard.editEvent;

  return (
    <Page
      title={mode === "new" ? words.newTitle : words.editTitle}
      eyebrow={heading(true)}
      backLabel={words.back}
      onBack={requestClose("button")}
      leaving={leaving !== null}
      onLeft={() => leaving?.()}
      compact={compact}
      banner={
        offline && (
          <Banner icon={WifiOff} title={words.offlineTitle} body={words.offlineBody} tone="soft" />
        )
      }
      startActions={
        asking ? <DiscardMessage title={discard.title} body={discardBody} /> : startActions
      }
      endActions={
        asking ? (
          <DiscardButtons
            keepLabel={discard.keepEditing}
            discardLabel={discard.discard}
            onKeep={() => dispatch({ type: "keepEditing" })}
            onDiscard={discardChanges}
          />
        ) : (
          endActions
        )
      }
      keyboardInset={keyboardInset}
      aside={preview?.(draft)}
    >
      <TextInput
        label={words.title}
        placeholder={words.titlePlaceholder}
        value={draft.title}
        onChange={(value) => dispatch({ type: "title", value })}
        error={state.titleError ? words.addTitle : undefined}
      />
      <EventTimes state={state} clock={clock} compact={compact} dispatch={dispatch} />
      <WhoField
        tags={tags}
        tagIds={draft.tagIds}
        input={state.whoInput}
        newColor={newColor}
        onInput={(value) => dispatch({ type: "whoInput", value })}
        onAdd={(id) => dispatch({ type: "addTag", id })}
        onRemove={(id) => dispatch({ type: "removeTag", id })}
        onColor={(color) => dispatch({ type: "newColor", color })}
        onCreate={createTag}
      />
      <TextInput
        label={words.where}
        placeholder={words.wherePlaceholder}
        value={draft.location}
        onChange={(value) => dispatch({ type: "location", value })}
      />
      <TextInput
        label={words.notes}
        placeholder={words.notesPlaceholder}
        value={draft.notes}
        onChange={(value) => dispatch({ type: "notes", value })}
        multiline
        rows={3}
      />
    </Page>
  );
}

function detailsPage({
  eyebrow,
  draft,
  tags,
  clock,
  status,
  compact,
  keyboardInset,
  aside,
  leaving,
  onClose,
  onEdit,
}: DetailsPageProps) {
  const ended = status === "ended";

  return (
    <Page
      title={draft.title}
      eyebrow={eyebrow}
      backLabel={words.back}
      onBack={onClose}
      leaving={leaving !== null}
      onLeft={() => leaving?.()}
      compact={compact}
      startActions={ended && <span {...stylex.props(styles.ended)}>{details.endedBody}</span>}
      endActions={
        !ended && (
          <Button icon={Pencil} onClick={onEdit}>
            {details.edit}
          </Button>
        )
      }
      keyboardInset={keyboardInset}
      aside={aside}
    >
      <EventDetails draft={draft} tags={tags} clock={clock} status={status} />
    </Page>
  );
}

function DayEyebrow({ day, forecast, date, onOpenDate }: DayEyebrowProps) {
  return (
    <>
      {date ? (
        <QuickDate
          label={day}
          day={date.day}
          today={date.today}
          onOpen={onOpenDate}
          onChange={date.onChange}
        />
      ) : (
        day
      )}
      {forecast && (
        <span {...stylex.props(styles.forecast)}>
          <Icon icon={weatherIcons[forecast.icon]} size={16} label={forecast.label} />
          {forecast.high}
        </span>
      )}
    </>
  );
}

function eventLength({ start, end, allDay }: EventDraft): number | undefined {
  if (allDay) return undefined;

  return end !== undefined && end > start ? end - start : undefined;
}

function useRevealTimes(picker: TimeFieldName | null, endError: boolean) {
  const times = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = times.current?.closest("[data-sheet-body]");

    if ((picker === null && !endError) || !times.current || !body) return;

    const box = body.getBoundingClientRect();
    const row = times.current.getBoundingClientRect();

    if (row.bottom <= box.bottom && row.top >= box.top) return;

    const header = body.querySelector<HTMLElement>("[data-page-header]")?.offsetHeight ?? 0;

    body.scrollTop += row.top - box.top - header - REVEAL_GAP;
  }, [picker, endError]);

  return times;
}

function EventTimes({ state, clock, compact, dispatch }: TimesProps) {
  const { draft, picker } = state;

  const times = useRevealTimes(picker, state.endError);

  const toggle = (field: TimeFieldName) => () => dispatch({ type: "toggle", field });

  const off = draft.allDay ? time.offAllDay : undefined;

  return (
    <div ref={times} {...stylex.props(styles.times)}>
      <div {...stylex.props(styles.fields)}>
        <TimeField
          label={time.starts}
          value={draft.start}
          clock={clock}
          open={picker === "start"}
          labels={time}
          onToggle={toggle("start")}
          compact={compact}
          off={off}
        />
        <TimeField
          label={time.ends}
          value={draft.end}
          clock={clock}
          length={eventLength(draft)}
          open={picker === "end"}
          error={state.endError ? time.endsBeforeStart : undefined}
          labels={time}
          onToggle={toggle("end")}
          compact={compact}
          off={off}
        />
      </div>
      <Switch
        label={copy.events.allDay}
        checked={draft.allDay === true}
        onChange={(value) => dispatch({ type: "allDay", value })}
      />
      {picker === "start" && (
        <TimePicker
          label={time.starts}
          groupLabel={time.startGroup}
          value={draft.start}
          clock={clock}
          labels={time}
          onChange={(value) => dispatch({ type: "start", value })}
          onDone={() => dispatch({ type: "done" })}
          compact={compact}
        />
      )}
      {picker === "end" && (
        <TimePicker
          label={time.ends}
          groupLabel={time.endGroup}
          value={draft.end ?? draft.start}
          clock={clock}
          labels={time}
          onChange={(value) => dispatch({ type: "end", value })}
          onDone={() => dispatch({ type: "done" })}
          ends={{
            start: draft.start,
            lengths: time.lengths,
            onNoEnd: () => dispatch({ type: "noEnd" }),
          }}
          compact={compact}
        />
      )}
    </div>
  );
}

function primaryLabel(mode: EventSheetProps["mode"], offline: boolean): string {
  if (offline) return words.saveOffline;

  return mode === "new" ? words.add : words.save;
}

function DeleteAction({ confirming, compact, onAsk, onDelete }: DeleteActionProps) {
  if (confirming)
    return (
      <Button variant="danger" icon={Trash2} onClick={onDelete}>
        {words.confirmDelete}
      </Button>
    );

  return (
    <Button variant="ghost" icon={Trash2} onClick={onAsk} xstyle={compact && styles.delete}>
      {words.delete}
    </Button>
  );
}
