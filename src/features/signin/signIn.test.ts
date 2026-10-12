import { initialSignIn, type SignInState, signInReducer } from "./signIn";

const ACCOUNT = { email: "maria@example.com", name: "Maria" };

const form = (email: string): SignInState => ({ step: "form", email });

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

  it("SIGNIN-09 the signed-in state ignores every action", () => {
    const done: SignInState = { step: "done", name: "Maria", returning: false };

    expect(signInReducer(done, { type: "back" })).toBe(done);
    expect(signInReducer(done, { type: "send" })).toBe(done);
  });
});
