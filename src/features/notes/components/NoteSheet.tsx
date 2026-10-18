"use client";

import * as stylex from "@stylexjs/stylex";
import { Trash2, WifiOff } from "lucide-react";
import { useReducer } from "react";
import { copy } from "@/copy";
import { shadows } from "@/theme/tokens.stylex";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { ColorSwatchPicker } from "@/ui/ColorSwatchPicker";
import { DiscardButtons, DiscardMessage } from "@/ui/DiscardPrompt";
import { type CloseFrom, closeStep } from "@/ui/discard";
import { Sheet } from "@/ui/Sheet";
import { TextInput } from "@/ui/TextInput";
import {
  canSave,
  isDirty,
  type NoteDraft,
  type NoteSheetState,
  type NoteSwatchOption,
  noteSheetReducer,
} from "../noteSheet";

type NoteSheetProps = {
  mode: "new" | "edit";
  eyebrow: string;
  initial: NoteSheetState;
  swatches: readonly NoteSwatchOption[];
  offline: boolean;
  keyboardInset?: number;
  onClose: () => void;
  onDelete: () => void;
  onSave: (draft: NoteDraft) => void;
};

const words = copy.notes.sheet;

const discard = copy.discard;

const styles = stylex.create({
  delete: {
    marginLeft: -12,
  },
  cancel: {
    boxShadow: shadows.shadow1,
  },
});

type DeleteActionProps = {
  confirming: boolean;
  onAsk: () => void;
  onDelete: () => void;
};

export function NoteSheet({
  mode,
  eyebrow,
  initial,
  swatches,
  offline,
  onClose,
  onDelete,
  onSave,
  keyboardInset,
}: NoteSheetProps) {
  const [state, dispatch] = useReducer(noteSheetReducer, initial);

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

  return (
    <Sheet
      title={mode === "new" ? words.newTitle : words.editTitle}
      eyebrow={eyebrow}
      closeLabel={words.close}
      onClose={requestClose("button")}
      onScrimTap={requestClose("scrim")}
      startActions={
        asking ? <DiscardMessage title={discard.title} body={discard.note} /> : startActions
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
        label={words.message}
        placeholder={words.messagePlaceholder}
        value={draft.text}
        onChange={(value) => dispatch({ type: "text", value })}
        error={state.textError ? words.writeMessage : undefined}
        multiline
        rows={3}
      />
      <TextInput
        label={words.name}
        placeholder={words.namePlaceholder}
        value={draft.author}
        onChange={(value) => dispatch({ type: "author", value })}
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

function primaryLabel(mode: NoteSheetProps["mode"], offline: boolean): string {
  if (offline) return words.saveOffline;

  return mode === "new" ? words.post : words.save;
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
