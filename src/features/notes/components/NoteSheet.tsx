"use client";

import * as stylex from "@stylexjs/stylex";
import { Pencil, Trash2, WifiOff } from "lucide-react";
import { useReducer } from "react";
import { copy } from "@/copy";
import { noteDetailsTilt } from "@/domain/notes";
import type { NoteTone } from "@/domain/schemas";
import { season } from "@/theme/seasons.stylex";
import { motion, radii, shadows } from "@/theme/tokens.stylex";
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
import { NoteDetails } from "./NoteDetails";

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
  time?: string;
  rotation?: number;
};

const words = copy.notes.sheet;

const details = copy.notes.details;

const discard = copy.discard;

const styles = stylex.create({
  delete: {
    marginLeft: -12,
  },
  cancel: {
    boxShadow: shadows.shadow1,
  },
  morph: {
    transitionProperty: "transform, border-radius, background-color",
    transitionDuration: motion.durBase,
    transitionTimingFunction: motion.easeOut,
  },
  sticky: {
    borderRadius: radii.sm,
  },
  tilt: (degrees: number) => ({ transform: `rotate(${degrees}deg)` }),
  tone1: { backgroundColor: season.block1 },
  tone2: { backgroundColor: season.block2 },
  tone3: { backgroundColor: season.block3 },
  tone4: { backgroundColor: season.block4 },
  soft: { backgroundColor: season.soft },
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
  time = "",
  rotation = 0,
}: NoteSheetProps) {
  const [state, dispatch] = useReducer(noteSheetReducer, initial);

  if (state.step === "details")
    return (
      <Sheet
        title={details.title(authorName(state.opened.author))}
        eyebrow={copy.notes.board}
        closeLabel={words.close}
        onClose={onClose}
        endActions={
          <Button icon={Pencil} onClick={() => dispatch({ type: "edit" })}>
            {details.edit}
          </Button>
        }
        keyboardInset={keyboardInset}
        uniform
        xstyle={[
          styles.morph,
          styles.sticky,
          toneStyle(state.opened.tone),
          styles.tilt(noteDetailsTilt(rotation)),
        ]}
      >
        <NoteDetails text={state.opened.text.trim()} time={time} />
      </Sheet>
    );

  const { draft, opened } = state;

  const asking = state.step === "discarding";

  const save = () => {
    if (!canSave(draft)) return dispatch({ type: "save" });

    onSave(draft);

    if (state.fromDetails) dispatch({ type: "saved" });
    else onClose();
  };

  const requestClose = (from: CloseFrom) => () => {
    const step = closeStep(asking, isDirty(draft, opened), from);

    if (step === "close") return onClose();

    if (step === "ask") dispatch({ type: "askDiscard" });
  };

  const cancel = () => {
    if (!state.fromDetails) return requestClose("button")();

    const step = closeStep(asking, isDirty(draft, opened), "button");

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
            onDiscard={discardChanges}
          />
        ) : (
          endActions
        )
      }
      keyboardInset={keyboardInset}
      xstyle={styles.morph}
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

function authorName(author: string): string {
  return author.trim() === "" ? copy.notes.guestAuthor : author.trim();
}

function toneStyle(tone: NoteTone) {
  return typeof tone === "number" ? styles[`tone${tone}`] : styles[tone];
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
