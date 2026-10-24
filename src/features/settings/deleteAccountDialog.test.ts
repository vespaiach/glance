import { type DeleteAccountDialog, deleteAccountDialog } from "./deleteAccountDialog";

const CLOSED: DeleteAccountDialog = { kind: "closed" };

const ASK: DeleteAccountDialog = { kind: "ask" };

const ACK: DeleteAccountDialog = { kind: "ack" };

const DELETING: DeleteAccountDialog = { kind: "deleting" };

const FAILED: DeleteAccountDialog = { kind: "failed" };

describe("deleteAccountDialog", () => {
  it("SET-14 Delete account opens the dialog unchecked", () => {
    expect(deleteAccountDialog(CLOSED, { type: "open" })).toEqual(ASK);
  });

  it("SET-14 the checkbox toggles between ask and acknowledged", () => {
    expect(deleteAccountDialog(ASK, { type: "toggle" })).toEqual(ACK);
    expect(deleteAccountDialog(ACK, { type: "toggle" })).toEqual(ASK);
  });

  it("SET-14 deleting can't start before the box is checked", () => {
    expect(deleteAccountDialog(ASK, { type: "confirm" })).toEqual(ASK);
  });

  it.each([ACK, FAILED])("SET-14 deleting starts from %o", (state) => {
    expect(deleteAccountDialog(state, { type: "confirm" })).toEqual(DELETING);
  });

  it.each([{ type: "cancel" }, { type: "toggle" }, { type: "confirm" }] as const)(
    "SET-14 %o does nothing while deleting",
    (action) => {
      expect(deleteAccountDialog(DELETING, action)).toEqual(DELETING);
    },
  );

  it("SET-14 a failed delete shows the error", () => {
    expect(deleteAccountDialog(DELETING, { type: "failed" })).toEqual(FAILED);
  });

  it.each([ASK, ACK, FAILED])("SET-14 Keep account closes the dialog from %o", (state) => {
    expect(deleteAccountDialog(state, { type: "cancel" })).toEqual(CLOSED);
  });
});
