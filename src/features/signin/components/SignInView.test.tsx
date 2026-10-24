import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { deviceTimeZone } from "@/domain/zone";
import type { WeatherSetupFlow } from "@/features/weather";
import type { SignInState } from "../signIn";
import { SignInView } from "./SignInView";

const tz = deviceTimeZone();

type Props = ComponentProps<typeof SignInView>;

const EMAIL = "maria@example.com";

const NOW = new Date(2026, 9, 9, 10, 41);

const secondsLater = (seconds: number) => new Date(NOW.getTime() + seconds * 1_000);

const ignore = () => {};

const SETUP: WeatherSetupFlow = {
  state: { step: "editing", draft: "" },
  canLocate: true,
  type: ignore,
  submit: ignore,
  pick: ignore,
  locate: ignore,
  confirm: ignore,
  keep: ignore,
  skip: ignore,
};

function renderView(state: SignInState, props: Partial<Props> = {}) {
  const handlers = {
    onAction: vi.fn(),
  };

  render(
    <SignInView
      state={state}
      setup={SETUP}
      season="fall"
      time={NOW}
      clock="12h"
      tz={tz}
      breakpoint="large"
      online
      {...handlers}
      {...props}
    />,
  );

  return handlers;
}

const LOCK = "Only your family can see its calendar, notes and photos.";

test("SIGNIN-01 the hero shows the wordmark, the date and time, the headline and the preview", () => {
  renderView({ step: "form", email: "" });

  expect(screen.getByText("Glance")).toBeInTheDocument();
  expect(screen.getByText("Friday, October 9")).toBeInTheDocument();
  expect(screen.getByText("10:41 AM")).toBeInTheDocument();
  expect(screen.getByText("Your family’s day, at a glance.")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Calendar, weather, notes and photos for your family. Sign in to manage them.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText("Soccer cleats are by the door")).toBeInTheDocument();
});

test("SIGNIN-01 on small the hero shows the short date and no preview", () => {
  renderView({ step: "form", email: "" }, { breakpoint: "small" });

  expect(screen.getByText("Fri, Oct 9")).toBeInTheDocument();
  expect(screen.queryByText("Today · 3 events")).not.toBeInTheDocument();
});

test("SIGNIN-01 the email form asks for an email with Send code", () => {
  renderView({ step: "form", email: "" });

  expect(screen.getByText("One account per family")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Sign in or get started" })).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveAttribute("placeholder", "name@example.com");
  expect(screen.getByRole("button", { name: "Send code" })).toBeEnabled();
  expect(screen.getByText(LOCK)).toBeInTheDocument();
});

test("SIGNIN-01 typing and Send code go out as actions", async () => {
  const { onAction } = renderView({ step: "form", email: "" });

  await userEvent.type(screen.getByLabelText("Email"), "m");
  await userEvent.click(screen.getByRole("button", { name: "Send code" }));

  expect(onAction).toHaveBeenCalledWith({ type: "email", email: "m" });
  expect(onAction).toHaveBeenCalledWith({ type: "send" });
});

test("SIGNIN-01 pressing Return in the email field sends the code", async () => {
  const { onAction } = renderView({ step: "form", email: EMAIL });

  await userEvent.type(screen.getByLabelText("Email"), "{Enter}");

  expect(onAction).toHaveBeenCalledWith({ type: "send" });
});

test("SIGNIN-02 an invalid email shows the error on the field", () => {
  renderView({ step: "form", email: "maria", error: "invalid" });

  expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Enter a valid email address");
});

test("SIGNIN-03 sending disables the button and shows the sending tile", () => {
  renderView({ step: "sending", email: EMAIL });

  expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent(`Sending a code to ${EMAIL}`);
  expect(screen.getByLabelText("Email")).toHaveValue(EMAIL);
  expect(screen.getByText(LOCK)).toBeInTheDocument();
});

const sent = (code = "", seconds = 10): SignInState => ({
  step: "sent",
  email: EMAIL,
  sentAt: secondsLater(-seconds),
  code,
});

const codeField = () => screen.getByRole("textbox", { name: "Code" });

const SIGN_IN = { name: "Sign in" };

const NEW_CODE = { name: "Send a new code" };

const OTHER_EMAIL = { name: "Use a different email" };

test("SIGNIN-04 Enter the code names the address and the 10-minute limit", () => {
  renderView(sent());

  expect(screen.getByRole("heading", { name: "Enter the code" })).toBeInTheDocument();
  expect(
    screen.getByText(
      (_, node) =>
        node?.textContent === `We sent a 6-digit code to ${EMAIL}. It works once, for 10 minutes.`,
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText(LOCK)).not.toBeInTheDocument();
});

test("SIGNIN-04 focus lands in the code field when the step opens", () => {
  renderView(sent());

  expect(codeField()).toHaveFocus();
});

test("SIGNIN-04 typing and pasting go out as code actions", async () => {
  const { onAction } = renderView(sent());

  await userEvent.paste("482 913");

  expect(onAction).toHaveBeenCalledWith({ type: "code", text: "482 913", online: true });
});

test("SIGNIN-04 Sign in is disabled under 6 digits", () => {
  renderView(sent("48291"));

  expect(screen.getByRole("button", SIGN_IN)).toBeDisabled();
});

test("SIGNIN-04 Sign in with 6 digits submits the code", async () => {
  const { onAction } = renderView(sent("482913"));

  await userEvent.click(screen.getByRole("button", SIGN_IN));

  expect(onAction).toHaveBeenCalledWith({ type: "verify", online: true });
});

test("SIGNIN-04 checking locks the field and reads Checking…", () => {
  renderView({ step: "checking", email: EMAIL, sentAt: secondsLater(-10), code: "482913" });

  expect(screen.getByRole("button", { name: "Checking…" })).toBeDisabled();
  expect(codeField()).toHaveAttribute("readonly");
  expect(codeField()).toHaveValue("482913");
});

test("SIGNIN-04 for 10 s after the send a mono timer stands in for both ghost buttons", () => {
  renderView(sent("", 2));

  expect(screen.getByRole("timer")).toHaveTextContent("New code or different email in 0:08");
  expect(screen.queryByRole("button", NEW_CODE)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", OTHER_EMAIL)).not.toBeInTheDocument();
});

test("SIGNIN-04 once the timer reaches 0 Send a new code and Use a different email show", async () => {
  const { onAction } = renderView(sent());

  await userEvent.click(screen.getByRole("button", NEW_CODE));
  await userEvent.click(screen.getByRole("button", OTHER_EMAIL));

  expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  expect(onAction).toHaveBeenCalledWith({ type: "send" });
  expect(onAction).toHaveBeenCalledWith({ type: "back" });
});

test("SIGNIN-17 a wrong code shows That code isn’t right on the field", () => {
  renderView({ ...sent(), wrong: true } as SignInState);

  expect(codeField()).toBeInvalid();
  expect(codeField()).toHaveAccessibleDescription("That code isn’t right. Try again.");
  expect(codeField()).toHaveValue("");
});

test("SIGNIN-17 a locked code disables the field and shows both ghost buttons at once", () => {
  renderView({ step: "locked", email: EMAIL, sentAt: secondsLater(-2) });

  expect(codeField()).toBeDisabled();
  expect(codeField()).toHaveAccessibleDescription("Too many tries. Send a new code.");
  expect(screen.getByRole("button", SIGN_IN)).toBeDisabled();
  expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  expect(screen.getByRole("button", NEW_CODE)).toBeEnabled();
  expect(screen.getByRole("button", OTHER_EMAIL)).toBeEnabled();
});

test("SIGNIN-10 offline the code can be typed but Sign in and Send a new code are off", async () => {
  const { onAction } = renderView(sent("482913"), { online: false });

  expect(screen.getByText("You’re offline")).toBeInTheDocument();
  expect(
    screen.getByText(
      "The code can’t be checked right now. Sign in turns back on when the screen reconnects.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", SIGN_IN)).toBeDisabled();
  expect(screen.getByRole("button", NEW_CODE)).toBeDisabled();
  expect(screen.getByRole("button", OTHER_EMAIL)).toBeEnabled();

  await userEvent.type(codeField(), "{Backspace}");

  expect(onAction).toHaveBeenCalledWith({ type: "code", text: "48291", online: false });
});

test("SIGNIN-03 a failed send shows Couldn’t send on the field with Send enabled", () => {
  renderView({ step: "form", email: EMAIL, error: "failed" });

  expect(screen.getByLabelText("Email")).toHaveValue(EMAIL);
  expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Couldn’t send. Try again.");
  expect(screen.getByRole("button", { name: "Send code" })).toBeEnabled();
});

test("SIGNIN-06 What's your name asks for a name for the new account", async () => {
  const { onAction } = renderView({ step: "name", email: EMAIL, draft: "" });

  expect(screen.getByText("New family account")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "What’s your name?" })).toBeInTheDocument();
  expect(screen.getByText(EMAIL)).toBeInTheDocument();
  expect(screen.getByLabelText("Your name")).toHaveAttribute("placeholder", "First name is fine");

  await userEvent.type(screen.getByLabelText("Your name"), "M");
  await userEvent.click(screen.getByRole("button", { name: "Continue" }));

  expect(onAction).toHaveBeenCalledWith({ type: "name", draft: "M" });
  expect(onAction).toHaveBeenCalledWith({ type: "submit-name" });
});

test("SIGNIN-06 a blank name shows Add your name on the field", () => {
  renderView({ step: "name", email: EMAIL, draft: "", error: "empty" });

  expect(screen.getByLabelText("Your name")).toHaveAccessibleDescription("Add your name");
});

test("SIGNIN-08 an expired code offers a new code or a different email", async () => {
  const { onAction } = renderView({ step: "expired", email: EMAIL });

  expect(screen.getByText("Sign in")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "This code has expired" })).toBeInTheDocument();
  expect(
    screen.getByText(
      (_, node) => node?.textContent === `Codes work for 10 minutes. Send a new one to ${EMAIL}.`,
    ),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", NEW_CODE));
  await userEvent.click(screen.getByRole("button", OTHER_EMAIL));

  expect(onAction).toHaveBeenCalledWith({ type: "send" });
  expect(onAction).toHaveBeenCalledWith({ type: "back" });
});

test("SIGNIN-09 a new account is welcomed by first name", () => {
  renderView({ step: "done", name: "Maria Lopez", returning: false });

  expect(screen.getByText("Signed in")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Welcome, Maria" })).toBeInTheDocument();
  expect(screen.getByText("Opening Today…")).toBeInTheDocument();
});

test("PHOTO-03 a Photos code says Photos is opening", () => {
  renderView({ step: "done", name: "Maria", returning: true }, { opens: "photos" });

  expect(screen.getByText("Opening Photos…")).toBeInTheDocument();
});

test("SIGNIN-09 a returning account is welcomed back", () => {
  renderView({ step: "done", name: "Maria", returning: true });

  expect(screen.getByRole("heading", { name: "Welcome back, Maria" })).toBeInTheDocument();
});

test("SIGNIN-10 offline shows the banner and disables sending, but the email can be typed", async () => {
  const { onAction } = renderView({ step: "form", email: EMAIL }, { online: false });

  expect(screen.getByText("You’re offline")).toBeInTheDocument();
  expect(
    screen.getByText(
      "A code can’t be sent right now. Sending turns back on when the screen reconnects.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send code" })).toBeDisabled();

  await userEvent.type(screen.getByLabelText("Email"), "x{Enter}");

  expect(onAction).toHaveBeenCalledWith({ type: "email", email: `${EMAIL}x` });
  expect(onAction).not.toHaveBeenCalledWith({ type: "send" });
});

const LOCATION: SignInState = {
  step: "location",
  account: { id: "0192f3a0-0000-7000-8000-000000000001", email: EMAIL, name: "Maria" },
  returning: false,
};

test("SIGNIN-14 Skip for now asks to end the step", async () => {
  const { onAction } = renderView(LOCATION);

  await userEvent.click(screen.getByRole("button", { name: "Skip for now" }));

  expect(onAction).toHaveBeenCalledExactlyOnceWith({ type: "skip" });
});

test("SIGNIN-14 Skip for now is off while the skip is on its way", () => {
  renderView({ ...LOCATION, skipping: true });

  expect(screen.getByRole("button", { name: "Skip for now" })).toBeDisabled();
});

test("SIGNIN-14 the setup card's primary reads Continue", () => {
  renderView(LOCATION);

  expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Use my location" })).toBeInTheDocument();
});

const SIGNED_OUT = { email: EMAIL, pending: 0 };

const WAITING = { email: EMAIL, pending: 3 };

const OTHER = "sam.lee@example.com";

test("SIGNIN-13 the signed-out form shows the notice and Sign in again", () => {
  renderView({ step: "form", email: EMAIL }, { signedOut: SIGNED_OUT });

  expect(screen.getByText("This screen was signed out")).toBeInTheDocument();
  expect(
    screen.getByText("Sign in again to keep the calendar, notes and photos up to date."),
  ).toBeInTheDocument();
  expect(screen.getByText("One account per family")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Sign in again" })).toBeInTheDocument();
  expect(
    screen.getByText(
      "Check your family’s email below. We’ll send a code that signs this screen back in.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveValue(EMAIL);
  expect(screen.getByText(LOCK)).toBeInTheDocument();
});

test("SIGNIN-13 waiting changes add the count and that they'll be sent", () => {
  renderView({ step: "form", email: EMAIL }, { signedOut: WAITING });

  expect(
    screen.getByText(
      "Sign in again to keep the calendar, notes and photos up to date. Changes waiting on this screen: 3. They’ll be sent after you sign in.",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: `Use ${EMAIL}` })).not.toBeInTheDocument();
});

test("SIGNIN-13 another email with changes waiting warns inline and offers the previous email", async () => {
  const { onAction } = renderView({ step: "form", email: OTHER }, { signedOut: WAITING });

  expect(
    screen.getByText(
      "Sign in again to keep the calendar, notes and photos up to date. Changes waiting on this screen: 3.",
    ),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("status")[1]).toHaveTextContent(
    `Changes waiting on this screen belong to ${EMAIL}. They’ll be removed from this screen if a different email signs in.`,
  );
  expect(screen.getByRole("button", { name: "Send code" })).toBeEnabled();

  await userEvent.click(screen.getByRole("button", { name: `Use ${EMAIL}` }));

  expect(onAction).toHaveBeenCalledWith({ type: "email", email: EMAIL });
});

test("SIGNIN-13 another email with nothing waiting shows no warning", () => {
  renderView({ step: "form", email: OTHER }, { signedOut: SIGNED_OUT });

  expect(screen.queryByRole("button", { name: `Use ${EMAIL}` })).not.toBeInTheDocument();
});

test("SIGNIN-13 the notice stays while the code is sending", () => {
  renderView({ step: "sending", email: EMAIL }, { signedOut: SIGNED_OUT });

  expect(screen.getByText("This screen was signed out")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
});
