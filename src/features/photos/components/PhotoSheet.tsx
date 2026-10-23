"use client";

import * as stylex from "@stylexjs/stylex";
import { Trash2, WifiOff } from "lucide-react";
import { useReducer } from "react";
import { copy } from "@/copy";
import type { Photo } from "@/domain/schemas";
import { colors, radii, shadows, space } from "@/theme/tokens.stylex";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { DiscardButtons, DiscardMessage } from "@/ui/DiscardPrompt";
import { type CloseFrom, closeStep } from "@/ui/discard";
import { Sheet } from "@/ui/Sheet";
import { TextInput } from "@/ui/TextInput";
import {
  draftProblem,
  fieldSource,
  isDirty,
  type PhotoField,
  type PhotoSheetState,
  photoFromDraft,
  photoSheetReducer,
} from "../photoSheet";

type PhotoSheetProps = {
  photo: Photo;
  src: string;
  today: string;
  initial: PhotoSheetState;
  offline: boolean;
  keyboardInset?: number;
  onClose: () => void;
  onDelete: () => void;
  onSave: (photo: Photo) => void;
};

const words = copy.photos.sheet;

const discard = copy.discard;

const styles = stylex.create({
  previewBlock: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
  },
  preview: {
    width: "100%",
    aspectRatio: "2 / 1",
    maxHeight: 160,
    objectFit: "cover",
    borderRadius: radii.md,
    display: "block",
    backgroundColor: colors.surfaceSoft,
  },
  file: {
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.4,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
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

export function PhotoSheet({
  photo,
  src,
  today,
  initial,
  offline,
  keyboardInset,
  onClose,
  onDelete,
  onSave,
}: PhotoSheetProps) {
  const [state, dispatch] = useReducer(photoSheetReducer, initial);

  const { draft } = state;

  const caption = (field: PhotoField) => words.sources[fieldSource(state, photo.sources, field)];

  const edit = (field: PhotoField) => (value: string) => dispatch({ type: "edit", field, value });

  const save = () => {
    if (draftProblem(draft, today)) return dispatch({ type: "save", today });

    onSave(photoFromDraft(photo, draft, state.opened));
  };

  const requestClose = (from: CloseFrom) => () => {
    const step = closeStep(state.confirm === "discard", isDirty(draft, state.opened), from);

    if (step === "close") return onClose();

    if (step === "ask") dispatch({ type: "askDiscard" });
  };

  const asking = state.confirm === "discard";

  return (
    <Sheet
      title={words.title}
      eyebrow={copy.photos.list}
      closeLabel={words.close}
      onClose={requestClose("button")}
      onScrimTap={requestClose("scrim")}
      startActions={
        asking ? (
          <DiscardMessage title={discard.title} body={discard.photo} />
        ) : (
          <DeleteAction
            confirming={state.confirm === "delete"}
            onAsk={() => dispatch({ type: "askDelete" })}
            onDelete={onDelete}
          />
        )
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
          <>
            <Button variant="secondary" onClick={requestClose("button")} xstyle={styles.cancel}>
              {words.cancel}
            </Button>
            <Button onClick={save}>{offline ? words.saveOffline : words.save}</Button>
          </>
        )
      }
      keyboardInset={keyboardInset}
    >
      {offline && (
        <Banner icon={WifiOff} title={words.offlineTitle} body={words.offlineBody} tone="soft" />
      )}
      <div {...stylex.props(styles.previewBlock)}>
        {/* biome-ignore lint/performance/noImgElement: photos come pre-sized from the authenticated file route and the service worker cache, not the Next image optimizer */}
        <img src={src} alt="" {...stylex.props(styles.preview)} />
        {photo.fileName && <span {...stylex.props(styles.file)}>{words.file(photo.fileName)}</span>}
      </div>
      <TextInput
        label={words.name}
        caption={caption("title")}
        placeholder={words.namePlaceholder}
        value={draft.title}
        onChange={edit("title")}
        error={state.error === "name" ? words.addName : undefined}
      />
      <TextInput
        label={words.date}
        caption={caption("takenOn")}
        type="date"
        max={today}
        value={draft.takenOn}
        onChange={edit("takenOn")}
        error={state.error === "future" ? words.futureDate : undefined}
      />
      <TextInput
        label={words.place}
        caption={caption("place")}
        placeholder={words.placePlaceholder}
        value={draft.place}
        onChange={edit("place")}
      />
    </Sheet>
  );
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
