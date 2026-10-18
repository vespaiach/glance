import type { Photo, PhotoSources } from "@/domain/schemas";
import { afterEdit, type SheetConfirm } from "@/ui/discard";

export type PhotoDraft = { title: string; takenOn: string; place: string };

export type PhotoField = keyof PhotoDraft;

export type PhotoSheetError = "name" | "future";

export type PhotoSheetState = {
  draft: PhotoDraft;
  opened: PhotoDraft;
  error: PhotoSheetError | null;
  confirm: SheetConfirm;
};

export type PhotoSheetAction =
  | { type: "edit"; field: PhotoField; value: string }
  | { type: "save"; today: string }
  | { type: "askDelete" }
  | { type: "askDiscard" }
  | { type: "keepEditing" };

const ERROR_FIELD: Record<PhotoSheetError, PhotoField> = { name: "title", future: "takenOn" };

const FIELDS: readonly PhotoField[] = ["title", "takenOn", "place"];

export function draftFromPhoto(photo: Photo): PhotoDraft {
  return { title: photo.title, takenOn: photo.takenOn ?? "", place: photo.place ?? "" };
}

export function initialPhotoSheet(
  draft: PhotoDraft,
  { discard = false }: { discard?: boolean } = {},
): PhotoSheetState {
  return { draft, opened: draft, error: null, confirm: discard ? "discard" : null };
}

export function isDirty(draft: PhotoDraft, opened: PhotoDraft): boolean {
  return FIELDS.some((field) => changed(draft, opened, field));
}

export function fieldSource<F extends PhotoField>(
  { draft, opened }: PhotoSheetState,
  sources: PhotoSources,
  field: F,
): PhotoSources[F] | "edited" {
  return changed(draft, opened, field) ? "edited" : sources[field];
}

export function draftProblem(draft: PhotoDraft, today: string): PhotoSheetError | null {
  if (draft.title.trim() === "") return "name";

  return draft.takenOn > today ? "future" : null;
}

export function photoFromDraft(photo: Photo, draft: PhotoDraft, opened: PhotoDraft): Photo {
  return {
    id: photo.id,
    title: draft.title.trim(),
    ...filled("takenOn", draft.takenOn),
    ...filled("place", draft.place.trim()),
    createdAt: photo.createdAt,
    sources: savedSources(photo, draft, opened),
    checked: true,
    ...(photo.fileName !== undefined && { fileName: photo.fileName }),
  };
}

export function photoSheetReducer(
  state: PhotoSheetState,
  action: PhotoSheetAction,
): PhotoSheetState {
  switch (action.type) {
    case "edit":
      return edited(state, action.field, action.value);
    case "save":
      return { ...state, error: draftProblem(state.draft, action.today) };
    case "askDelete":
      return { ...state, confirm: "delete" };
    case "askDiscard":
      return { ...state, confirm: "discard" };
    case "keepEditing":
      return { ...state, confirm: null };
  }
}

function changed(draft: PhotoDraft, opened: PhotoDraft, field: PhotoField): boolean {
  return draft[field].trim() !== opened[field].trim();
}

function savedSources(photo: Photo, draft: PhotoDraft, opened: PhotoDraft): PhotoSources {
  const source = <F extends PhotoField>(field: F) =>
    changed(draft, opened, field) ? "edited" : photo.sources[field];

  return { title: source("title"), takenOn: source("takenOn"), place: source("place") };
}

function filled<K extends string>(key: K, value: string) {
  return (value === "" ? {} : { [key]: value }) as { [P in K]?: string };
}

function edited(state: PhotoSheetState, field: PhotoField, value: string): PhotoSheetState {
  const error = state.error && ERROR_FIELD[state.error] === field ? null : state.error;

  return {
    draft: { ...state.draft, [field]: value },
    opened: state.opened,
    error,
    confirm: afterEdit(state.confirm),
  };
}
