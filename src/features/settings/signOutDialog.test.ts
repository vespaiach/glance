import { type SignOutDialog, signOutDialog } from "./signOutDialog";

const CLOSED: SignOutDialog = { kind: "closed" };

const OPEN: SignOutDialog = { kind: "open" };

const SIGNING_OUT: SignOutDialog = { kind: "signing-out" };

const FAILED: SignOutDialog = { kind: "failed" };

describe("signOutDialog", () => {
  it("SIGNIN-11 Sign out opens the dialog", () => {
    expect(signOutDialog(CLOSED, { type: "open" })).toEqual(OPEN);
  });

  it.each([OPEN, FAILED])("SIGNIN-11 Cancel closes the dialog from %o", (state) => {
    expect(signOutDialog(state, { type: "cancel" })).toEqual(CLOSED);
  });

  it.each([OPEN, FAILED])("SIGNIN-11 Sign out all devices starts from %o", (state) => {
    expect(signOutDialog(state, { type: "sign-out-all" })).toEqual(SIGNING_OUT);
  });

  it("SIGNIN-11 a failed request keeps the dialog open with the error", () => {
    expect(signOutDialog(SIGNING_OUT, { type: "failed" })).toEqual(FAILED);
  });

  it("SIGNIN-11 Cancel does nothing while signing out", () => {
    expect(signOutDialog(SIGNING_OUT, { type: "cancel" })).toEqual(SIGNING_OUT);
  });
});
