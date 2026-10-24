export type DeleteAccountDialog =
  | { kind: "closed" }
  | { kind: "ask" }
  | { kind: "ack" }
  | { kind: "deleting" }
  | { kind: "failed" };

export type DeleteAccountAction =
  | { type: "open" }
  | { type: "toggle" }
  | { type: "confirm" }
  | { type: "cancel" }
  | { type: "failed" };

export const DELETE_CLOSED: DeleteAccountDialog = { kind: "closed" };

export function deleteAccountDialog(
  dialog: DeleteAccountDialog,
  action: DeleteAccountAction,
): DeleteAccountDialog {
  switch (action.type) {
    case "open":
      return dialog.kind === "closed" ? { kind: "ask" } : dialog;
    case "toggle":
      return toggled(dialog);
    case "confirm":
      return dialog.kind === "ack" || dialog.kind === "failed" ? { kind: "deleting" } : dialog;
    case "cancel":
      return dialog.kind === "deleting" ? dialog : DELETE_CLOSED;
    case "failed":
      return dialog.kind === "deleting" ? { kind: "failed" } : dialog;
  }
}

function toggled(dialog: DeleteAccountDialog): DeleteAccountDialog {
  if (dialog.kind === "ask") return { kind: "ack" };

  if (dialog.kind === "ack" || dialog.kind === "failed") return { kind: "ask" };

  return dialog;
}
