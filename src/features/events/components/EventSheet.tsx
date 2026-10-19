"use client";

import * as stylex from "@stylexjs/stylex";
import { Trash2, WifiOff } from "lucide-react";
import { useEffect, useReducer, useRef } from "react";
import { copy } from "@/copy";
import type { Clock } from "@/domain/time";
import { colors, shadows } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { DiscardButtons, DiscardMessage } from "@/ui/DiscardPrompt";
import { type CloseFrom, closeStep } from "@/ui/discard";
import { PillTabs } from "@/ui/PillTabs";
import { Sheet } from "@/ui/Sheet";
import { TextInput } from "@/ui/TextInput";
import { TimeField } from "@/ui/TimeField";
import { TimePicker } from "@/ui/TimePicker";
import {
  canSave,
  type EventDraft,
  type EventSheetAction,
  type EventSheetState,
  eventSheetReducer,
  isDirty,
  type TimeFieldName,
} from "../eventSheet";

type EventSheetProps = {
  mode: "new" | "edit";
  eyebrow: string;
  initial: EventSheetState;
  clock: Clock;
  offline: boolean;
  compact?: boolean;
  keyboardInset?: number;
  onClose: () => void;
  onDelete: () => void;
  onSave: (draft: EventDraft) => void;
};

const words = copy.events.sheet;

const discard = copy.discard;

const time = copy.events.time;

const styles = stylex.create({
  mode: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  modeLabel: {
    fontSize: type.bodyLgSize,
    fontWeight: type.bodyLgWeight,
    letterSpacing: type.bodyLgLs,
  },
  modeTabs: {
    backgroundColor: colors.surfaceSoft,
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
});

const ACTIONS_ROOM = 96;

const REVEAL_GAP = 16;

type TimesProps = {
  state: EventSheetState;
  clock: Clock;
  compact?: boolean;
  dispatch: (action: EventSheetAction) => void;
};

type TimeMode = "times" | "allDay";

const TIME_MODES = [
  { value: "times", label: time.setTimes },
  { value: "allDay", label: copy.events.allDay },
] as const;

type TimeModeProps = {
  allDay: boolean;
  dispatch: (action: EventSheetAction) => void;
};

type DeleteActionProps = {
  confirming: boolean;
  onAsk: () => void;
  onDelete: () => void;
};

export function EventSheet({
  mode,
  eyebrow,
  initial,
  clock,
  offline,
  compact,
  onClose,
  onDelete,
  onSave,
  keyboardInset,
}: EventSheetProps) {
  const [state, dispatch] = useReducer(eventSheetReducer, initial);

  const { draft } = state;

  const save = () => (canSave(draft) ? onSave(draft) : dispatch({ type: "save" }));

  const requestClose = (from: CloseFrom) => () => {
    const step = closeStep(state.confirm, isDirty(draft, state.opened), from);

    if (step === "close") return onClose();

    if (step === "ask") dispatch({ type: "askDiscard" });
  };

  const endActions = (
    <>
      <Button variant="secondary" onClick={requestClose("button")} xstyle={styles.cancel}>
        {words.cancel}
      </Button>
      <Button onClick={save}>{primaryLabel(mode, offline)}</Button>
    </>
  );

  const startActions = mode === "edit" && (
    <DeleteAction
      confirming={state.confirm === "delete"}
      onAsk={() => dispatch({ type: "askDelete" })}
      onDelete={onDelete}
    />
  );

  const asking = state.confirm === "discard";

  const discardBody = mode === "new" ? discard.newEvent : discard.editEvent;

  return (
    <Sheet
      title={mode === "new" ? words.newTitle : words.editTitle}
      eyebrow={eyebrow}
      closeLabel={words.close}
      onClose={requestClose("button")}
      onScrimTap={requestClose("scrim")}
      startActions={
        asking ? <DiscardMessage title={discard.title} body={discardBody} /> : startActions
      }
      endActions={
        asking ? (
          <DiscardButtons
            keepLabel={discard.keepEditing}
            discardLabel={discard.discard}
            onKeep={() => dispatch({ type: "keepEditing" })}
            onDiscard={onClose}
          />
        ) : (
          endActions
        )
      }
      keyboardInset={keyboardInset}
    >
      {offline && (
        <Banner icon={WifiOff} title={words.offlineTitle} body={words.offlineBody} tone="soft" />
      )}
      <TextInput
        label={words.title}
        placeholder={words.titlePlaceholder}
        value={draft.title}
        onChange={(value) => dispatch({ type: "title", value })}
        error={state.titleError ? words.addTitle : undefined}
      />
      <TimeModeRow allDay={draft.allDay === true} dispatch={dispatch} />
      {!draft.allDay && (
        <EventTimes state={state} clock={clock} compact={compact} dispatch={dispatch} />
      )}
      <TextInput
        label={words.where}
        placeholder={words.wherePlaceholder}
        value={draft.location}
        onChange={(value) => dispatch({ type: "location", value })}
      />
    </Sheet>
  );
}

function eventLength({ start, end }: EventDraft): number | undefined {
  return end !== undefined && end > start ? end - start : undefined;
}

function useRevealTimes(picker: TimeFieldName | null, endError: boolean) {
  const times = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = times.current?.closest("[role=dialog]");

    if ((picker === null && !endError) || !times.current || !dialog) return;

    const box = dialog.getBoundingClientRect();
    const row = times.current.getBoundingClientRect();

    if (row.bottom <= box.bottom - ACTIONS_ROOM && row.top >= box.top) return;

    dialog.scrollTop += row.top - box.top - REVEAL_GAP;
  }, [picker, endError]);

  return times;
}

function EventTimes({ state, clock, compact, dispatch }: TimesProps) {
  const { draft, picker } = state;

  const times = useRevealTimes(picker, state.endError);

  const toggle = (field: TimeFieldName) => () => dispatch({ type: "toggle", field });

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
        />
      </div>
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

function TimeModeRow({ allDay, dispatch }: TimeModeProps) {
  const onChange = (mode: TimeMode) => dispatch({ type: "allDay", value: mode === "allDay" });

  return (
    <div {...stylex.props(styles.mode)}>
      <span aria-hidden="true" {...stylex.props(styles.modeLabel)}>
        {time.label}
      </span>
      <PillTabs
        label={time.label}
        options={TIME_MODES}
        value={allDay ? "allDay" : "times"}
        onChange={onChange}
        size="lg"
        xstyle={styles.modeTabs}
      />
    </div>
  );
}

function primaryLabel(mode: EventSheetProps["mode"], offline: boolean): string {
  if (offline) return words.saveOffline;

  return mode === "new" ? words.add : words.save;
}

function DeleteAction({ confirming, onAsk, onDelete }: DeleteActionProps) {
  if (confirming)
    return (
      <Button variant="danger" icon={Trash2} onClick={onDelete}>
        {words.confirmDelete}
      </Button>
    );

  return (
    <Button variant="ghost" icon={Trash2} onClick={onAsk} xstyle={styles.delete}>
      {words.delete}
    </Button>
  );
}
