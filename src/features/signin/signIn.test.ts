import {
  initialSignIn,
  openedLinkFrom,
  openedPath,
  openedViewFrom,
  type SignInAction,
  type SignInState,
  signInReducer,
} from "./signIn";

const ACCOUNT = {
  id: "0195f0a0-0000-7000-8000-00000000000a",
  email: "maria@example.com",
  name: "Maria",
};

const form = (email: string): SignInState => ({ step: "form", email });

const sending: SignInState = { step: "sending", email: "maria@example.com" };

const NOW = new Date("2026-10-09T17:41:00Z");

const LATER = new Date("2026-10-09T17:45:00Z");

const sent: SignInState = { step: "sent", email: "maria@example.com", sentAt: NOW, code: "" };

const typed = (code: string): SignInState => ({ ...sent, code });

const checking: SignInState = {
  step: "checking",
  email: "maria@example.com",
  sentAt: NOW,
  code: "482913",
};

const locked: SignInState = { step: "locked", email: "maria@example.com", sentAt: NOW };

const expired: SignInState = { step: "expired", email: "maria@example.com" };

const minutesLater = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

const locating: SignInState = { step: "location", account: ACCOUNT, returning: false };

describe("sign-in reducer", () => {
  it("SIGNIN-01 starts on the empty email form", () => {
    expect(initialSignIn()).toEqual(form(""));
  });

  it("SIGNIN-13 a screen signed out by the server opens the form with its last email", () => {
    expect(initialSignIn(undefined, { email: "maria@example.com" })).toEqual(
      form("maria@example.com"),
    );
  });

  it("SIGNIN-13 an opened link still checks the link on a signed-out screen", () => {
    expect(initialSignIn("opened", { email: "maria@example.com" })).toEqual({
      step: "opening",
    });
  });

  it("SIGNIN-01 typing updates the email", () => {
    expect(signInReducer(form("mar"), { type: "email", email: "mari" })).toEqual(form("mari"));
  });

  it("SIGNIN-02 an invalid email shows the error", () => {
    expect(signInReducer(form("maria@example"), { type: "send" })).toEqual({
      step: "form",
      email: "maria@example",
      error: "invalid",
    });
  });

  it("SIGNIN-02 the next keystroke clears the error", () => {
    const invalid: SignInState = { step: "form", email: "maria", error: "invalid" };

    expect(signInReducer(invalid, { type: "email", email: "maria@" })).toEqual(form("maria@"));
  });

  it("SIGNIN-03 a valid email starts sending to the trimmed address", () => {
    expect(signInReducer(form(" maria@example.com "), { type: "send" })).toEqual({
      step: "sending",
      email: "maria@example.com",
    });
  });

  it("SIGNIN-03 the email can't be edited while sending", () => {
    const sending: SignInState = { step: "sending", email: "maria@example.com" };

    expect(signInReducer(sending, { type: "email", email: "x" })).toBe(sending);
    expect(signInReducer(sending, { type: "send" })).toBe(sending);
  });

  it.each([typed("48"), checking, locked, expired])(
    "SIGNIN-04 Use a different email returns to the form with the email kept ($step)",
    (state) => {
      expect(signInReducer(state, { type: "back" })).toEqual(form("maria@example.com"));
    },
  );

  it.each([typed("48"), checking, locked, expired])(
    "SIGNIN-04 Send a new code starts sending again ($step)",
    (state) => {
      expect(signInReducer(state, { type: "send" })).toEqual(sending);
    },
  );

  it("SIGNIN-04 typing keeps only the digits, at most 6", () => {
    expect(signInReducer(sent, { type: "code", text: "48 2a", online: true })).toEqual(
      typed("482"),
    );
  });

  it("SIGNIN-04 the 6th digit submits on its own", () => {
    expect(signInReducer(typed("48291"), { type: "code", text: "482913", online: true })).toEqual(
      checking,
    );
  });

  it('SIGNIN-04 pasting "482 913" submits the code', () => {
    expect(signInReducer(sent, { type: "code", text: "482 913", online: true })).toEqual(checking);
  });

  it("SIGNIN-10 offline the 6th digit is kept but never submits", () => {
    expect(signInReducer(typed("48291"), { type: "code", text: "482913", online: false })).toEqual(
      typed("482913"),
    );
  });

  it("SIGNIN-04 Sign in submits 6 digits", () => {
    expect(signInReducer(typed("482913"), { type: "verify", online: true })).toEqual(checking);
  });

  it("SIGNIN-04 Sign in does nothing under 6 digits", () => {
    const state = typed("48291");

    expect(signInReducer(state, { type: "verify", online: true })).toBe(state);
  });

  it("SIGNIN-10 Sign in does nothing offline", () => {
    const state = typed("482913");

    expect(signInReducer(state, { type: "verify", online: false })).toBe(state);
  });

  it("SIGNIN-04 the field is locked while the code is checked", () => {
    expect(signInReducer(checking, { type: "code", text: "1", online: true })).toBe(checking);
    expect(signInReducer(checking, { type: "verify", online: true })).toBe(checking);
  });

  it("SIGNIN-17 a wrong code clears the field and turns the cells red", () => {
    expect(signInReducer(checking, { type: "rejected", error: "wrong-code" })).toEqual({
      ...sent,
      wrong: true,
    });
  });

  it("SIGNIN-17 the next digit clears the wrong code", () => {
    expect(
      signInReducer({ ...sent, wrong: true }, { type: "code", text: "4", online: true }),
    ).toEqual(typed("4"));
  });

  it("SIGNIN-17 the 5th wrong try locks the code", () => {
    expect(signInReducer(checking, { type: "rejected", error: "code-locked" })).toEqual(locked);
  });

  it("SIGNIN-17 a locked code takes no digits and never submits", () => {
    expect(signInReducer(locked, { type: "code", text: "4", online: true })).toBe(locked);
    expect(signInReducer(locked, { type: "verify", online: true })).toBe(locked);
  });

  it("SIGNIN-08 the server finding the code expired opens This code has expired", () => {
    expect(signInReducer(checking, { type: "rejected", error: "code-expired" })).toEqual(expired);
  });

  it("SIGNIN-10 a check that can't reach the server keeps the code for another try", () => {
    expect(signInReducer(checking, { type: "rejected", error: "network" })).toEqual(
      typed("482913"),
    );
  });

  it("SIGNIN-04 check answers are ignored outside Checking", () => {
    const state = typed("4");

    expect(signInReducer(state, { type: "rejected", error: "wrong-code" })).toBe(state);
  });

  it("SIGNIN-08 Enter the code expires 10 min after the send", () => {
    expect(signInReducer(typed("48"), { type: "tick", now: minutesLater(10) })).toEqual(expired);
  });

  it("SIGNIN-08 Enter the code stays open before 10 min", () => {
    const state = typed("48");

    expect(signInReducer(state, { type: "tick", now: minutesLater(9.99) })).toBe(state);
  });

  it("SIGNIN-08 a code being checked doesn't expire under it", () => {
    expect(signInReducer(checking, { type: "tick", now: minutesLater(11) })).toBe(checking);
  });

  it("SIGNIN-06 typing updates the name", () => {
    const naming: SignInState = { step: "name", email: "maria@example.com", draft: "Mar" };

    expect(signInReducer(naming, { type: "name", draft: "Mari" })).toEqual({
      ...naming,
      draft: "Mari",
    });
  });

  it("SIGNIN-06 Continue with a blank name asks for one", () => {
    const naming: SignInState = { step: "name", email: "maria@example.com", draft: "  " };

    expect(signInReducer(naming, { type: "submit-name" })).toEqual({ ...naming, error: "empty" });
  });

  it("SIGNIN-06 the next keystroke clears the name error", () => {
    const naming: SignInState = {
      step: "name",
      email: "maria@example.com",
      draft: "",
      error: "empty",
    };

    expect(signInReducer(naming, { type: "name", draft: "M" })).toEqual({
      step: "name",
      email: "maria@example.com",
      draft: "M",
    });
  });

  it("SIGNIN-04 the server accepting the send opens Enter the code from that moment", () => {
    expect(signInReducer(sending, { type: "code-sent", at: NOW })).toEqual(sent);
  });

  it("SIGNIN-04 a new send restarts the countdown", () => {
    const resent = [
      { type: "send" },
      { type: "code-sent", at: LATER },
    ] as const satisfies SignInAction[];

    expect(resent.reduce(signInReducer, typed("48"))).toEqual({ ...sent, sentAt: LATER });
  });

  it("SIGNIN-08 Send a new code from the expired screen restarts the countdown", () => {
    const resent = [{ type: "send" }, { type: "code-sent", at: LATER }] as const;

    expect(resent.reduce(signInReducer, expired)).toEqual({ ...sent, sentAt: LATER });
  });

  it("SIGNIN-03 a failed send returns to the form with the email kept", () => {
    expect(signInReducer(sending, { type: "send-failed" })).toEqual({
      step: "form",
      email: "maria@example.com",
      error: "failed",
    });
  });

  it("SIGNIN-03 the next keystroke clears Couldn’t send", () => {
    const failed: SignInState = { step: "form", email: "maria@example.com", error: "failed" };

    expect(signInReducer(failed, { type: "email", email: "maria@example.co" })).toEqual(
      form("maria@example.co"),
    );
  });

  it("SIGNIN-03 Send retries after Couldn’t send", () => {
    const failed: SignInState = { step: "form", email: "maria@example.com", error: "failed" };

    expect(signInReducer(failed, { type: "send" })).toEqual(sending);
  });

  it("SIGNIN-03 send answers are ignored outside Sending", () => {
    const typing = form("ana@example.com");

    expect(signInReducer(typing, { type: "code-sent", at: NOW })).toBe(typing);
    expect(signInReducer(typing, { type: "send-failed" })).toBe(typing);
  });

  it("SIGNIN-09 the right code welcomes the account", () => {
    const status = {
      state: "signed-in",
      account: ACCOUNT,
      returning: true,
      setupDone: true,
    } as const;

    expect(signInReducer(checking, { type: "status", status })).toEqual({
      step: "done",
      name: "Maria",
      returning: true,
    });
  });

  it.each([form("maria@example.com"), typed("48")])(
    "SIGNIN-04 sign-in answers are ignored outside Checking ($step)",
    (state) => {
      const status = {
        state: "signed-in",
        account: ACCOUNT,
        returning: true,
        setupDone: true,
      } as const;

      expect(signInReducer(state, { type: "status", status })).toBe(state);
    },
  );

  it("SIGNIN-22 a scanned code signs the form in to Welcome back", () => {
    const status = {
      state: "signed-in",
      account: ACCOUNT,
      returning: true,
      setupDone: true,
    } as const;

    expect(signInReducer(form(""), { type: "scanned", status })).toEqual({
      step: "done",
      name: "Maria",
      returning: true,
    });
  });

  it("SIGNIN-22 a scanned code is ignored outside the form", () => {
    const status = {
      state: "signed-in",
      account: ACCOUNT,
      returning: true,
      setupDone: true,
    } as const;

    expect(signInReducer(sending, { type: "scanned", status })).toBe(sending);
  });

  it("SIGNIN-06 Continue with a name starts saving it", () => {
    const naming: SignInState = { step: "name", email: "maria@example.com", draft: "Ana" };

    expect(signInReducer(naming, { type: "submit-name" })).toEqual({ ...naming, saving: true });
  });

  it("SIGNIN-06 the name can't be edited while it saves", () => {
    const saving: SignInState = {
      step: "name",
      email: "maria@example.com",
      draft: "Ana",
      saving: true,
    };

    expect(signInReducer(saving, { type: "name", draft: "x" })).toBe(saving);
    expect(signInReducer(saving, { type: "submit-name" })).toBe(saving);
  });

  it("SIGNIN-14 a saved name goes on to Where is this screen?", () => {
    const saving: SignInState = {
      step: "name",
      email: "ana@example.com",
      draft: "Ana Lee",
      saving: true,
    };

    const account = { ...ACCOUNT, name: "Ana Lee" };

    expect(signInReducer(saving, { type: "named", account })).toEqual({
      step: "location",
      account,
      returning: false,
    });
  });

  it.each([{ step: "opening" }, checking] as const)(
    "SIGNIN-14 a named account whose location step never ended asks for it ($step)",
    (state) => {
      const status = {
        state: "signed-in",
        account: ACCOUNT,
        returning: true,
        setupDone: false,
      } as const;

      expect(signInReducer(state, { type: "status", status })).toEqual({
        step: "location",
        account: ACCOUNT,
        returning: true,
      });
    },
  );

  it("SIGNIN-14 Skip for now starts ending the step", () => {
    expect(signInReducer(locating, { type: "skip" })).toEqual({ ...locating, skipping: true });
  });

  it("SIGNIN-14 Skip for now does nothing while a skip is on its way", () => {
    const skipping: SignInState = { ...locating, skipping: true };

    expect(signInReducer(skipping, { type: "skip" })).toBe(skipping);
  });

  it("SIGNIN-14 a failed skip stays on the step", () => {
    expect(signInReducer({ ...locating, skipping: true }, { type: "skip-failed" })).toEqual(
      locating,
    );
  });

  it.each([locating, { ...locating, skipping: true } as const])(
    "SIGNIN-09 the step ending welcomes the account ($skipping)",
    (state) => {
      expect(signInReducer(state, { type: "setup-done" })).toEqual({
        step: "done",
        name: "Maria",
        returning: false,
      });
    },
  );

  it("SIGNIN-14 setup answers are ignored outside the location step", () => {
    expect(signInReducer(sent, { type: "setup-done" })).toBe(sent);
    expect(signInReducer(sent, { type: "skip" })).toBe(sent);
    expect(signInReducer(sent, { type: "skip-failed" })).toBe(sent);
  });

  it("SIGNIN-06 a failed name save keeps the name and says so", () => {
    const saving: SignInState = {
      step: "name",
      email: "ana@example.com",
      draft: "Ana",
      saving: true,
    };

    expect(signInReducer(saving, { type: "name-failed" })).toEqual({
      step: "name",
      email: "ana@example.com",
      draft: "Ana",
      error: "failed",
    });
  });

  it("SIGNIN-15 the device that opened a QR link starts by checking it", () => {
    expect(initialSignIn("opened")).toEqual({ step: "opening" });
    expect(initialSignIn("stale")).toEqual({ step: "opening" });
  });

  it("SIGNIN-09 a link opened for a named account welcomes it", () => {
    const status = {
      state: "signed-in",
      account: ACCOUNT,
      returning: true,
      setupDone: true,
    } as const;

    expect(signInReducer({ step: "opening" }, { type: "status", status })).toEqual({
      step: "done",
      name: "Maria",
      returning: true,
    });
  });

  it.each([{ step: "opening" }, checking] as const)(
    "SIGNIN-06 a signed-in account with no name asks for one ($step)",
    (state) => {
      const account = { ...ACCOUNT, email: "ana@example.com", name: null };

      const status = { state: "signed-in", account, returning: false, setupDone: false } as const;

      expect(signInReducer(state, { type: "status", status })).toEqual({
        step: "name",
        email: "ana@example.com",
        draft: "",
      });
    },
  );

  it("SIGNIN-15 a stale QR link opens the empty form and never shows an email", () => {
    expect(
      signInReducer({ step: "opening" }, { type: "status", status: { state: "signed-out" } }),
    ).toEqual(form(""));
  });

  it("SIGNIN-10 a link check that can't reach the server opens the empty form", () => {
    expect(signInReducer({ step: "opening" }, { type: "status-failed" })).toEqual(form(""));
  });

  it("SIGNIN-04 a failed link check is ignored on Enter the code", () => {
    expect(signInReducer(sent, { type: "status-failed" })).toBe(sent);
  });

  it.each([
    ["?link=opened", "opened"],
    ["?link=stale", "stale"],
    ["?link=other", undefined],
    ["", undefined],
  ] as const)("SIGNIN-15 reads the QR link answer from %j", (search, link) => {
    expect(openedLinkFrom(search)).toBe(link);
  });

  it.each([
    ["?link=opened&to=photos", "photos"],
    ["?link=opened", "today"],
    ["?link=opened&to=settings", "today"],
    ["?link=stale&to=photos", "today"],
    ["", "today"],
  ] as const)("PHOTO-03 a QR link from %j opens %s", (search, view) => {
    expect(openedViewFrom(search)).toBe(view);
  });

  it.each([
    ["?link=opened&to=import&forDisplay=wall-1", "/settings/import?forDisplay=wall-1"],
    ["?link=opened&to=import", "/settings/import"],
    ["?link=opened&to=photos&forDisplay=wall-1", "/photos"],
    ["?link=opened", "/today"],
  ] as const)("IMP-04 a QR link from %j opens %s", (search, path) => {
    expect(openedPath(search)).toBe(path);
  });

  it("SIGNIN-09 the signed-in state ignores every action", () => {
    const done: SignInState = { step: "done", name: "Maria", returning: false };

    expect(signInReducer(done, { type: "back" })).toBe(done);
    expect(signInReducer(done, { type: "send" })).toBe(done);
  });
});
