"use client";

import * as stylex from "@stylexjs/stylex";
import { Trash2, WifiOff } from "lucide-react";
import { useReducer } from "react";
import { copy } from "@/copy";
import { shadows } from "@/theme/tokens.stylex";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { ColorSwatchPicker } from "@/ui/ColorSwatchPicker";
import { Sheet } from "@/ui/Sheet";
import { TextInput } from "@/ui/TextInput";
import {
  canSave,
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

const styles = stylex.create({
  delete: {
    marginLeft: -12,
  },
  cancel: {
    boxShadow: shadows.shadow1,
  },
});

function primaryLabel(mode: NoteSheetProps["mode"], offline: boolean): string {
  if (offline) return words.saveOffline;

  return mode === "new" ? words.post : words.save;
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

  const endActions = (
    <>
      <Button variant="secondary" onClick={onClose} xstyle={styles.cancel}>
        {words.cancel}
      </Button>
      <Button onClick={save}>{primaryLabel(mode, offline)}</Button>
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
