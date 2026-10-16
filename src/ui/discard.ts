export type SheetConfirm = "delete" | "discard" | null;

export type CloseFrom = "scrim" | "button";

export type CloseStep = "close" | "ask" | "stay";

export function closeStep(confirm: SheetConfirm, dirty: boolean, from: CloseFrom): CloseStep {
  if (confirm === "discard") return from === "scrim" ? "stay" : "close";

  return dirty ? "ask" : "close";
}

export function afterEdit(confirm: SheetConfirm): SheetConfirm {
  return confirm === "discard" ? null : confirm;
}
