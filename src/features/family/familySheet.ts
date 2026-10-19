import { type EventWho, freeColors, type MemberNameError, removalImpact } from "@/domain/members";
import type { Member, MemberColor } from "@/domain/schemas";
import { afterEdit, type SheetConfirm } from "@/ui/discard";

export type FamilySheetState = {
  removing: string | null;
  name: string;
  color: MemberColor | null;
  error: MemberNameError | null;
  confirm: SheetConfirm;
};

export type FamilySheetOptions = {
  removing?: string;
  name?: string;
  error?: boolean;
  discard?: boolean;
};

export type FamilySheetAction =
  | { type: "name"; value: string }
  | { type: "color"; value: MemberColor }
  | { type: "askRemove"; id: string }
  | { type: "keepMember" }
  | { type: "removed" }
  | { type: "invalid"; error: MemberNameError }
  | { type: "added" }
  | { type: "askDiscard" }
  | { type: "keepEditing" };

export type FamilyRow = { member: Member; solo: number; shared: number };

export function initialFamilySheet({
  removing,
  name = "",
  error = false,
  discard = false,
}: FamilySheetOptions = {}): FamilySheetState {
  return {
    removing: removing ?? null,
    name,
    color: null,
    error: error ? fixtureError(name) : null,
    confirm: discard ? "discard" : null,
  };
}

export function familySheetReducer(
  state: FamilySheetState,
  action: FamilySheetAction,
): FamilySheetState {
  switch (action.type) {
    case "name":
      return { ...state, name: action.value, error: null, confirm: afterEdit(state.confirm) };
    case "color":
      return { ...state, color: action.value };
    case "askRemove":
      return { ...state, removing: action.id };
    case "keepMember":
    case "removed":
      return { ...state, removing: null };
    case "invalid":
      return { ...state, error: action.error };
    case "added":
      return { ...state, name: "", color: null, error: null };
    case "askDiscard":
      return { ...state, confirm: "discard" };
    case "keepEditing":
      return { ...state, confirm: null };
  }
}

export function shownColor(color: MemberColor | null, members: readonly Member[]): MemberColor {
  const free = freeColors(members);

  const [first = "lilac"] = free;

  return color !== null && free.includes(color) ? color : first;
}

export function isDirty(state: FamilySheetState): boolean {
  return state.name.trim() !== "";
}

export function familyRows(members: readonly Member[], events: readonly EventWho[]): FamilyRow[] {
  return members.map((member) => {
    const { solo, shared } = removalImpact(member.id, events);

    return { member, solo: solo.length, shared: shared.length };
  });
}

function fixtureError(name: string): MemberNameError {
  return name.trim() === "" ? "empty" : "taken";
}
