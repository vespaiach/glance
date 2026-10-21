"use client";

import * as stylex from "@stylexjs/stylex";
import { Pencil, Trash2, WifiOff } from "lucide-react";
import { useEffect, useReducer, useRef } from "react";
import { copy } from "@/copy";
import type { DetailsStatus } from "@/domain/eventStatus";
import type { Member } from "@/domain/schemas";
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
  type EventEditState,
  type EventSheetAction,
  type EventSheetState,
  eventSheetReducer,
  isDirty,
  type TimeFieldName,
} from "../eventSheet";
import { EventDetails } from "./EventDetails";
import { WhoPicker } from "./WhoPicker";

type EventSheetProps = {
  mode: "new" | "edit";
  eyebrow: string;
  initial: EventSheetState;
  clock: Clock;
  members: readonly Member[];
  offline: boolean;
  status?: DetailsStatus;
  compact?: boolean;
  keyboardInset?: number;
  onClose: () => void;
  onDelete: () => void;
  onSave: (draft: EventDraft) => void;
};

const words = copy.events.sheet;

const discard = copy.discard;

const time = copy.events.time;

const details = copy.events.details;

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
  ended: {
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    fontSize: type.bodySize,
    fontWeight: type.bodyLgWeight,
    lineHeight: 1.4,
  },
});

const ACTIONS_ROOM = 96;

const REVEAL_GAP = 16;

type TimesProps = {
  state: EventEditState;
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

type DetailsSheetProps = {
  eyebrow: string;
  draft: EventDraft;
  members: readonly Member[];
  clock: Clock;
  status: DetailsStatus;
  keyboardInset?: number;
  onClose: () => void;
  onEdit: () => void;
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
  members,
  offline,
  status = null,
  compact,
  onClose,
  onDelete,
  onSave,
  keyboardInset,
}: EventSheetProps) {
  const [state, dispatch] = useReducer(eventSheetReducer, initial);

  if (state.step === "details")
    return (
      <DetailsSheet
        eyebrow={eyebrow}
        draft={state.opened}
        members={members}
        clock={clock}
        status={status}
        keyboardInset={keyboardInset}
        onClose={onClose}
        onEdit={() => dispatch({ type: "edit" })}
      />
    );

  const { draft } = state;

  const asking = state.step === "discarding";

  const save = () => {
    if (!canSave(draft)) return dispatch({ type: "save" });

    onSave(draft);

    if (state.fromDetails) dispatch({ type: "saved" });
    else onClose();
  };

  const requestClose = (from: CloseFrom) => () => {
    const step = closeStep(asking, isDirty(draft, state.opened), from);

    if (step === "close") return onClose();

    if (step === "ask") dispatch({ type: "askDiscard" });
  };

  const cancel = () => {
    if (!state.fromDetails) return requestClose("button")();

    const step = closeStep(asking, isDirty(draft, state.opened), "button");

    dispatch(step === "ask" ? { type: "askDiscard", to: "details" } : { type: "back" });
  };

  const discardChanges = () =>
    asking && state.discardTo === "details" ? dispatch({ type: "back" }) : onClose();

  const endActions = (
    <>
      <Button variant="secondary" onClick={cancel} xstyle={styles.cancel}>
        {words.cancel}
      </Button>
      <Button onClick={save}>{primaryLabel(mode, offline)}</Button>
    </>
  );

  const startActions = mode === "edit" && (
    <DeleteAction
      confirming={state.step === "deleting"}
      onAsk={() => dispatch({ type: "askDelete" })}
      onDelete={onDelete}
    />
  );

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
            onDiscard={discardChanges}
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
      <WhoPicker
        label={words.who}
        everyoneLabel={copy.events.everyone}
        members={members}
        who={draft}
        onEveryone={() => dispatch({ type: "everyone" })}
        onMember={(id) => dispatch({ type: "member", id, family: familyIds(members) })}
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
    </Sheet>
  );
}

function DetailsSheet({
  eyebrow,
  draft,
  members,
  clock,
  status,
  keyboardInset,
  onClose,
  onEdit,
}: DetailsSheetProps) {
  const ended = status === "ended";

  return (
    <Sheet
      title={draft.title}
      eyebrow={eyebrow}
      closeLabel={words.close}
      onClose={onClose}
      startActions={ended && <span {...stylex.props(styles.ended)}>{details.endedBody}</span>}
      endActions={
        !ended && (
          <Button icon={Pencil} onClick={onEdit}>
            {details.edit}
          </Button>
        )
      }
      keyboardInset={keyboardInset}
    >
      <EventDetails draft={draft} members={members} clock={clock} status={status} />
    </Sheet>
  );
}

function familyIds(members: readonly Member[]): string[] {
  return members.map((member) => member.id);
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
