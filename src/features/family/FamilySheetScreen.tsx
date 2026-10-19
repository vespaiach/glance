"use client";

import { useMemberPlans, useMembers, useMembersRepo } from "@/data/repos";
import { uuidv7 } from "@/domain/id";
import type { MemberColor } from "@/domain/schemas";
import { useKeyboardInset } from "@/shell/keyboard";
import { useNowStore } from "@/shell/providers/now";
import { useSheetHost } from "@/shell/SheetHost";
import { FamilySheet } from "./components/FamilySheet";
import { familyRows, initialFamilySheet } from "./familySheet";

type LoadedProps = { removing?: string; name?: string; error?: true; discard?: true };

export function FamilySheetScreen() {
  const { sheet } = useSheetHost();

  if (sheet?.kind !== "family") return null;

  return (
    <LoadedFamilySheet
      removing={sheet.removing}
      name={sheet.name}
      error={sheet.error}
      discard={sheet.discard}
    />
  );
}

function LoadedFamilySheet(options: LoadedProps) {
  const { close } = useSheetHost();

  const members = useMembers();

  const plans = useMemberPlans();

  const repo = useMembersRepo();

  const nowStore = useNowStore();

  const keyboardInset = useKeyboardInset();

  if (members === undefined || plans === undefined) return null;

  const onAdd = (name: string, color: MemberColor) => {
    const now = nowStore.get();

    void repo.put({ id: uuidv7(now), name, color, createdAt: now.toISOString() });
  };

  return (
    <FamilySheet
      rows={familyRows(members, plans)}
      initial={initialFamilySheet(options)}
      keyboardInset={keyboardInset}
      onAdd={onAdd}
      onRemove={(id) => void repo.remove(id)}
      onClose={close}
    />
  );
}
