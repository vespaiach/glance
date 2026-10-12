"use client";

import * as stylex from "@stylexjs/stylex";
import { Trash2, WifiOff } from "lucide-react";
import { useEffect, useReducer, useRef } from "react";
import { copy } from "@/copy";
import type { Clock } from "@/domain/time";
import { shadows } from "@/theme/tokens.stylex";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { ColorSwatchPicker } from "@/ui/ColorSwatchPicker";
import { Sheet } from "@/ui/Sheet";
import { TextInput } from "@/ui/TextInput";
import { TimeField } from "@/ui/TimeField";
import { TimePicker } from "@/ui/TimePicker";
import {
  type EventDraft,
  type EventSheetAction,
  type EventSheetState,
  eventSheetReducer,
  type SwatchOption,
  type TimeFieldName,
} from "../eventSheet";

type EventSheetProps = {
  mode: "new" | "edit";
  eyebrow: string;
  initial: EventSheetState;
  clock: Clock;
  swatches: readonly SwatchOption[];
  offline: boolean;
  compact?: boolean;
  onClose: () => void;
  onDelete: () => void;
};

const words = copy.events.sheet;

const time = copy.events.time;

const styles = stylex.create({
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

function eventLength({ start, end }: EventDraft): number | undefined {
  return end !== undefined && end > start ? end - start : undefined;
}

const ACTIONS_ROOM = 96;

const REVEAL_GAP = 16;

function useRevealPicker(picker: TimeFieldName | null) {
  const times = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = times.current?.closest("[role=dialog]");

    if (picker === null || !times.current || !dialog) return;

    const box = dialog.getBoundingClientRect();
    const row = times.current.getBoundingClientRect();

    if (row.bottom <= box.bottom - ACTIONS_ROOM && row.top >= box.top) return;

    dialog.scrollTop += row.top - box.top - REVEAL_GAP;
  }, [picker]);

  return times;
}

type TimesProps = {
  state: EventSheetState;
  clock: Clock;
  compact?: boolean;
  dispatch: (action: EventSheetAction) => void;
};

function EventTimes({ state, clock, compact, dispatch }: TimesProps) {
  const { draft, picker } = state;

  const times = useRevealPicker(picker);

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

function primaryLabel(mode: EventSheetProps["mode"], offline: boolean): string {
  if (offline) return words.saveOffline;

  return mode === "new" ? words.add : words.save;
}

type DeleteActionProps = {
  confirming: boolean;
  onAsk: () => void;
  onDelete: () => void;
};

function DeleteAction({ confirming, onAsk, onDelete }: DeleteActionProps) {
  if (confirming)
    return (
      <Button variant="accent" icon={Trash2} onClick={onDelete}>
        {words.confirmDelete}
      </Button>
    );

  return (
    <Button variant="ghost" icon={Trash2} onClick={onAsk} xstyle={styles.delete}>
      {words.delete}
    </Button>
  );
}

export function EventSheet({
  mode,
  eyebrow,
  initial,
  clock,
  swatches,
  offline,
  compact,
  onClose,
  onDelete,
}: EventSheetProps) {
  const [state, dispatch] = useReducer(eventSheetReducer, initial);

  const { draft } = state;

  const endActions = (
    <>
      <Button variant="secondary" onClick={onClose} xstyle={styles.cancel}>
        {words.cancel}
      </Button>
      <Button>{primaryLabel(mode, offline)}</Button>
    </>
  );

  const startActions = mode === "edit" && (
    <DeleteAction
      confirming={state.confirming}
      onAsk={() => dispatch({ type: "askDelete" })}
      onDelete={onDelete}
    />
  );

  return (
    <Sheet
      title={mode === "new" ? words.newTitle : words.editTitle}
      eyebrow={eyebrow}
      closeLabel={words.close}
      onClose={onClose}
      startActions={startActions}
      endActions={endActions}
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
      <EventTimes state={state} clock={clock} compact={compact} dispatch={dispatch} />
      <TextInput
        label={words.where}
        placeholder={words.wherePlaceholder}
        value={draft.location}
        onChange={(value) => dispatch({ type: "location", value })}
      />
      <ColorSwatchPicker
        label={words.color}
        options={swatches}
        value={draft.tone}
        onChange={(value) => dispatch({ type: "tone", value })}
      />
    </Sheet>
  );
}
