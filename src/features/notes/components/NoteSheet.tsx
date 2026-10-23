"use client";

import * as stylex from "@stylexjs/stylex";
import { Pencil, Trash2, WifiOff } from "lucide-react";
import { useReducer } from "react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import { passesBoardLimit } from "@/domain/notes";
import { season } from "@/theme/seasons.stylex";
import { radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { DiscardButtons, DiscardMessage } from "@/ui/DiscardPrompt";
import { closeStep } from "@/ui/discard";
import { Sheet } from "@/ui/Sheet";
import {
  canSave,
  isDirty,
  isViewing,
  type NoteDraft,
  type NoteSheetState,
  type NoteViewState,
  noteSheetReducer,
} from "../noteSheet";
import { NoteComposer } from "./NoteComposer";
import { NoteDetails } from "./NoteDetails";

type NoteSheetProps = {
  mode: "new" | "edit";
  initial: NoteSheetState;
  offline: boolean;
  breakpoint: Breakpoint;
  keyboardInset?: number;
  onClose: () => void;
  onDelete: () => void;
  onSave: (draft: NoteDraft) => void;
  time?: string;
};

type DetailsProps = Pick<NoteSheetProps, "keyboardInset" | "onClose" | "onDelete"> & {
  state: NoteViewState;
  time: string;
  onAskDelete: () => void;
  onEdit: () => void;
};

type DeleteActionProps = {
  confirming: boolean;
  onAsk: () => void;
  onDelete: () => void;
};

const words = copy.notes.sheet;

const details = copy.notes.details;

const discard = copy.discard;

const styles = stylex.create({
  paper: {
    backgroundColor: season.soft,
    borderRadius: radii.sm,
  },
  delete: {
    marginLeft: -12,
  },
  caption: {
    alignSelf: "center",
    whiteSpace: "nowrap",
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
    fontVariantNumeric: "tabular-nums",
  },
  counter: {
    paddingRight: 8,
  },
});

export function NoteSheet({
  mode,
  initial,
  offline,
  breakpoint,
  onClose,
  onDelete,
  onSave,
  keyboardInset,
  time = "",
}: NoteSheetProps) {
  const [state, dispatch] = useReducer(noteSheetReducer, initial);

  if (isViewing(state))
    return (
      <NoteDetailsSheet
        state={state}
        time={time}
        keyboardInset={keyboardInset}
        onClose={onClose}
        onDelete={onDelete}
        onAskDelete={() => dispatch({ type: "askDelete" })}
        onEdit={() => dispatch({ type: "edit" })}
      />
    );

  const { draft, opened } = state;

  const asking = state.step === "discarding";

  const title = mode === "new" ? words.newTitle : words.editTitle;

  const save = () => {
    if (!canSave(draft)) return dispatch({ type: "save" });

    onSave(draft);

    if (state.fromDetails) dispatch({ type: "saved" });
    else onClose();
  };

  const leave = () => {
    const toDetails = asking ? state.discardTo === "details" : state.fromDetails;

    if (toDetails) dispatch({ type: "back" });
    else onClose();
  };

  const closeButton = () => {
    const step = closeStep(asking, isDirty(draft, opened), "button");

    if (step !== "ask") return leave();

    dispatch({ type: "askDiscard", to: state.fromDetails ? "details" : undefined });
  };

  const scrimTap = () => {
    const step = closeStep(asking, isDirty(draft, opened), "scrim");

    if (step === "close") return onClose();

    if (step === "ask") dispatch({ type: "askDiscard" });
  };

  const endActions = (
    <>
      {passesBoardLimit(draft.text.trim()) && (
        <span aria-live="polite" {...stylex.props(styles.caption, styles.counter)}>
          {words.boardShows}
        </span>
      )}
      <Button onClick={save}>{primaryLabel(mode, offline)}</Button>
    </>
  );

  const byline = mode === "edit" && (
    <span {...stylex.props(styles.caption)}>{copy.notes.byline(opened.author.trim(), time)}</span>
  );

  return (
    <Sheet
      title={title}
      eyebrow={title}
      hideTitle
      uniform
      placement={breakpoint === "small" ? "full" : "top"}
      closeLabel={words.close}
      onClose={closeButton}
      onScrimTap={scrimTap}
      startActions={asking ? <DiscardMessage title={discard.title} body={discard.note} /> : byline}
      endActions={
        asking ? (
          <DiscardButtons
            keepLabel={discard.keepEditing}
            discardLabel={discard.discard}
            onKeep={() => dispatch({ type: "keepEditing" })}
            onDiscard={leave}
          />
        ) : (
          endActions
        )
      }
      keyboardInset={keyboardInset}
      xstyle={styles.paper}
    >
      {offline && (
        <Banner icon={WifiOff} title={words.offlineTitle} body={words.offlineBody} tone="soft" />
      )}
      <NoteComposer
        draft={draft}
        textError={state.textError}
        onText={(value) => dispatch({ type: "text", value })}
        onAuthor={(value) => dispatch({ type: "author", value })}
      />
    </Sheet>
  );
}

function NoteDetailsSheet({
  state,
  time,
  keyboardInset,
  onClose,
  onDelete,
  onAskDelete,
  onEdit,
}: DetailsProps) {
  const author = state.opened.author.trim();

  return (
    <Sheet
      title={details.title(author)}
      eyebrow={copy.notes.byline(author, time)}
      hideTitle
      uniform
      closeLabel={words.close}
      onClose={onClose}
      startActions={
        <DeleteAction
          confirming={state.step === "deleting"}
          onAsk={onAskDelete}
          onDelete={onDelete}
        />
      }
      endActions={
        <Button icon={Pencil} onClick={onEdit}>
          {details.edit}
        </Button>
      }
      keyboardInset={keyboardInset}
      xstyle={styles.paper}
    >
      <NoteDetails text={state.opened.text.trim()} />
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
