export type SignOutDialog =
  | { kind: "closed" }
  | { kind: "open" }
  | { kind: "signing-out" }
  | { kind: "failed" };

export type SignOutDialogAction =
  | { type: "open" }
  | { type: "cancel" }
  | { type: "sign-out-all" }
  | { type: "failed" };

export const SIGN_OUT_CLOSED: SignOutDialog = { kind: "closed" };

export function signOutDialog(dialog: SignOutDialog, action: SignOutDialogAction): SignOutDialog {
  switch (action.type) {
    case "open":
      return dialog.kind === "closed" ? { kind: "open" } : dialog;
    case "cancel":
      return dialog.kind === "signing-out" ? dialog : SIGN_OUT_CLOSED;
    case "sign-out-all":
      return dialog.kind === "open" || dialog.kind === "failed" ? { kind: "signing-out" } : dialog;
    case "failed":
      return dialog.kind === "signing-out" ? { kind: "failed" } : dialog;
  }
}
