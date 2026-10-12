import { initialSignIn, openedLinkFrom, type SignInState, signInReducer } from "./signIn";

const ACCOUNT = {
  id: "0195f0a0-0000-7000-8000-00000000000a",
  email: "maria@example.com",
  name: "Maria",
};

const form = (email: string): SignInState => ({ step: "form", email });

const sending: SignInState = { step: "sending", email: "maria@example.com" };

const sent: SignInState = { step: "sent", email: "maria@example.com" };

const phone: SignInState = { step: "phone", email: "maria@example.com" };

const locating: SignInState = { step: "location", account: ACCOUNT, returning: false };

describe("sign-in reducer", () => {
  it("SIGNIN-01 starts on the empty email form", () => {
    expect(initialSignIn({}, ACCOUNT)).toEqual(form(""));
    expect(initialSignIn({ signin: "form" }, ACCOUNT)).toEqual(form(""));
  });

  it.each([
    ["sending", { step: "sending", email: "maria@example.com" }],
    ["offline", { step: "form", email: "maria@example.com" }],
    ["sent", { step: "sent", email: "maria@example.com" }],
    ["name", { step: "name", email: "maria@example.com", draft: "" }],
    ["phone", { step: "phone", email: "maria@example.com" }],
    ["expired", { step: "expired", email: "maria@example.com", onLink: false }],
    ["location", { step: "location", account: ACCOUNT, returning: false }],
    ["done", { step: "done", name: "Maria", returning: false }],
  ] as const)("tech§4.2 signin=%s opens its state with the fixture account", (signin, state) => {
    expect(initialSignIn({ signin }, ACCOUNT)).toEqual(state);
  });

  it("SIGNIN-12 signin=expired&on=link opens the device that opened the link", () => {
    expect(initialSignIn({ signin: "expired", on: "link" }, ACCOUNT)).toMatchObject({
      onLink: true,
    });
  });

  it("SIGNIN-09 signin=done&acct=returning opens Welcome back", () => {
    expect(initialSignIn({ signin: "done", acct: "returning" }, ACCOUNT)).toMatchObject({
      returning: true,
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

  it.each([
    { step: "sent", email: "maria@example.com" },
    { step: "phone", email: "maria@example.com" },
    { step: "expired", email: "maria@example.com", onLink: false },
  ] as const)(
    "SIGNIN-04 Use a different email returns to the form with the email kept ($step)",
    (state) => {
      expect(signInReducer(state, { type: "back" })).toEqual(form("maria@example.com"));
    },
  );

  it.each([true, false])("SIGNIN-08 Send a new link starts sending again (onLink %s)", (onLink) => {
    const expired: SignInState = { step: "expired", email: "maria@example.com", onLink };

    expect(signInReducer(expired, { type: "send" })).toEqual({
      step: "sending",
      email: "maria@example.com",
    });
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

  it("SIGNIN-04 the server accepting the link opens Check your email", () => {
    expect(signInReducer(sending, { type: "link-sent" })).toEqual(sent);
  });

  it("SIGNIN-03 a failed send returns to the form with the email kept", () => {
    expect(signInReducer(sending, { type: "link-failed" })).toEqual({
      step: "form",
      email: "maria@example.com",
      error: "failed",
    });
  });

  it("SIGNIN-03 link answers are ignored outside Sending", () => {
    const typing = form("ana@example.com");

    expect(signInReducer(typing, { type: "link-sent" })).toBe(typing);
    expect(signInReducer(typing, { type: "link-failed" })).toBe(typing);
  });

  it("SIGNIN-04 a waiting answer keeps Check your email", () => {
    expect(signInReducer(sent, { type: "status", status: { state: "waiting" } })).toBe(sent);
  });

  it("SIGNIN-08 an expired answer shows the expired waiting screen", () => {
    expect(signInReducer(sent, { type: "status", status: { state: "expired" } })).toEqual({
      step: "expired",
      email: "maria@example.com",
      onLink: false,
    });
  });

  it("SIGNIN-07 a link opened elsewhere on a new account shows Finish on your phone", () => {
    expect(
      signInReducer(sent, { type: "status", status: { state: "finishing-elsewhere" } }),
    ).toEqual({ step: "phone", email: "maria@example.com" });
  });

  it.each([sent, phone])("SIGNIN-09 a signed-in answer welcomes the account ($step)", (state) => {
    const status = {
      state: "signed-in",
      account: ACCOUNT,
      returning: true,
      setupDone: true,
    } as const;

    expect(signInReducer(state, { type: "status", status })).toEqual({
      step: "done",
      name: "Maria",
      returning: true,
    });
  });

  it("SIGNIN-04 status answers are ignored once the person left the waiting screen", () => {
    const typing = form("maria@example.com");

    expect(signInReducer(typing, { type: "status", status: { state: "expired" } })).toBe(typing);
  });

  it("SIGNIN-06 the link opened on this screen for a new email asks for a name", () => {
    expect(signInReducer(sent, { type: "opened-link" })).toEqual({
      step: "name",
      email: "maria@example.com",
      draft: "",
    });
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

  it.each([{ step: "opening" }, sent] as const)(
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

  it("SIGNIN-09 the device that opened a link starts by checking it", () => {
    expect(initialSignIn({ signin: "sent" }, ACCOUNT, "opened")).toEqual({ step: "opening" });
    expect(initialSignIn({}, ACCOUNT, "stale")).toEqual({ step: "opening" });
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

  it.each([{ step: "opening" }, sent] as const)(
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

  it("SIGNIN-12 a stale link shows the expired step for its email on the opening device", () => {
    const status = { state: "expired", email: "maria@example.com" } as const;

    expect(signInReducer({ step: "opening" }, { type: "status", status })).toEqual({
      step: "expired",
      email: "maria@example.com",
      onLink: true,
    });
  });

  it("SIGNIN-12 a stale link with no known email opens the empty form", () => {
    expect(
      signInReducer({ step: "opening" }, { type: "status", status: { state: "expired" } }),
    ).toEqual(form(""));
  });

  it("SIGNIN-10 a link check that can't reach the server opens the empty form", () => {
    expect(signInReducer({ step: "opening" }, { type: "status-failed" })).toEqual(form(""));
  });

  it("SIGNIN-04 a failed status poll keeps the waiting screen", () => {
    expect(signInReducer(sent, { type: "status-failed" })).toBe(sent);
  });

  it.each([
    ["?link=opened", "opened"],
    ["?link=stale", "stale"],
    ["?link=other", undefined],
    ["", undefined],
  ] as const)("SIGNIN-12 reads the link answer from %j", (search, link) => {
    expect(openedLinkFrom(search)).toBe(link);
  });

  it("SIGNIN-09 the signed-in state ignores every action", () => {
    const done: SignInState = { step: "done", name: "Maria", returning: false };

    expect(signInReducer(done, { type: "back" })).toBe(done);
    expect(signInReducer(done, { type: "send" })).toBe(done);
  });
});
