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
    onDemo: vi.fn(),
    onOpenedLink: vi.fn(),
    onFinishedOnPhone: vi.fn(),
  };

  render(
    <SignInView
      state={state}
      setup={SETUP}
      season="fall"
      time={NOW}
      clock="12h"
      tz={tz}
      breakpoint="wide"
      online
      demo
      {...handlers}
      {...props}
    />,
  );

  return handlers;
}

const LOCK = "Only your family can see its calendar, notes and photos.";

test("SIGNIN-01 the hero shows the wordmark, the season and month, the clock and the tagline", () => {
  renderView({ step: "form", email: "" });

  expect(screen.getByText("Glance")).toBeInTheDocument();
  expect(screen.getByText("Fall · October")).toBeInTheDocument();
  expect(screen.getByText("10:41")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Calendar, weather, notes and photos for your family. Sign in to manage them.",
    ),
  ).toBeInTheDocument();
});

test("SIGNIN-01 the email form asks for an email with Send sign-in link and Continue as guests", () => {
  renderView({ step: "form", email: "" });

  expect(screen.getByText("One account per family")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Sign in or get started" })).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveAttribute("placeholder", "name@example.com");
  expect(screen.getByRole("button", { name: "Send sign-in link" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Continue as guests" })).toBeInTheDocument();
  expect(screen.getByText(LOCK)).toBeInTheDocument();
});

test("SIGNIN-01 typing and Send sign-in link go out as actions", async () => {
  const { onAction } = renderView({ step: "form", email: "" });

  await userEvent.type(screen.getByLabelText("Email"), "m");
  await userEvent.click(screen.getByRole("button", { name: "Send sign-in link" }));

  expect(onAction).toHaveBeenCalledWith({ type: "email", email: "m" });
  expect(onAction).toHaveBeenCalledWith({ type: "send" });
});

test("SIGNIN-01 pressing Return in the email field sends the link", async () => {
  const { onAction } = renderView({ step: "form", email: EMAIL });

  await userEvent.type(screen.getByLabelText("Email"), "{Enter}");

  expect(onAction).toHaveBeenCalledWith({ type: "send" });
});

test("SIGNIN-02 an invalid email shows the error on the field", () => {
  renderView({ step: "form", email: "maria", error: "invalid" });

  expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Enter a valid email address");
});

test("SIGNIN-03 sending disables the button, hides demo and shows the sending tile", () => {
  renderView({ step: "sending", email: EMAIL });

  expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Continue as guests" })).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(`Sending a link to ${EMAIL}`);
  expect(screen.getByLabelText("Email")).toHaveValue(EMAIL);
  expect(screen.getByText(LOCK)).toBeInTheDocument();
});

test("SIGNIN-04 Check your email names the address and the 10-minute expiry", () => {
  renderView({ step: "sent", email: EMAIL });

  expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();
  expect(
    screen.getByText(
      (_, node) =>
        node?.textContent ===
        `We sent a link to ${EMAIL}. Open it and this screen signs in by itself.`,
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Link expires in 10 minutes");
  expect(screen.queryByText(LOCK)).not.toBeInTheDocument();
});

test("SIGNIN-04 Use a different email goes back and I opened the link is a dev action", async () => {
  const { onAction, onOpenedLink } = renderView({ step: "sent", email: EMAIL });

  await userEvent.click(screen.getByRole("button", { name: "Use a different email" }));
  await userEvent.click(screen.getByRole("button", { name: "I opened the link" }));

  expect(onAction).toHaveBeenCalledWith({ type: "back" });
  expect(onOpenedLink).toHaveBeenCalled();
});

test("SIGNIN-04 I opened the link is hidden outside demo builds", () => {
  renderView({ step: "sent", email: EMAIL }, { demo: false });

  expect(screen.queryByRole("button", { name: "I opened the link" })).not.toBeInTheDocument();
});

test("SIGNIN-05 Continue as guests goes out as onDemo", async () => {
  const { onDemo } = renderView({ step: "form", email: "" });

  await userEvent.click(screen.getByRole("button", { name: "Continue as guests" }));

  expect(onDemo).toHaveBeenCalled();
});

test("SIGNIN-05 Continue as guests is hidden outside demo builds", () => {
  renderView({ step: "form", email: "" }, { demo: false });

  expect(screen.queryByRole("button", { name: "Continue as guests" })).not.toBeInTheDocument();
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

test("SIGNIN-07 Finish on your phone waits for the phone", async () => {
  const { onFinishedOnPhone } = renderView({ step: "phone", email: EMAIL });

  expect(screen.getByRole("heading", { name: "Finish on your phone" })).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Waiting for your phone");

  await userEvent.click(screen.getByRole("button", { name: "I finished on my phone" }));

  expect(onFinishedOnPhone).toHaveBeenCalled();
});

test("SIGNIN-08 the waiting screen's expired link offers a new link or a different email", async () => {
  const { onAction } = renderView({ step: "expired", email: EMAIL, onLink: false });

  expect(screen.getByRole("heading", { name: "This link has expired" })).toBeInTheDocument();
  expect(screen.getByText(EMAIL)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Send a new link" }));
  await userEvent.click(screen.getByRole("button", { name: "Use a different email" }));

  expect(onAction).toHaveBeenCalledWith({ type: "send" });
  expect(onAction).toHaveBeenCalledWith({ type: "back" });
});

test("SIGNIN-09 a new account is welcomed by first name", () => {
  renderView({ step: "done", name: "Maria Lopez", returning: false });

  expect(screen.getByText("Signed in")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Welcome, Maria" })).toBeInTheDocument();
  expect(screen.getByText("Opening Today…")).toBeInTheDocument();
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
      "A link can’t be sent right now. Sending turns back on when the screen reconnects.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send sign-in link" })).toBeDisabled();

  await userEvent.type(screen.getByLabelText("Email"), "x{Enter}");

  expect(onAction).toHaveBeenCalledWith({ type: "email", email: `${EMAIL}x` });
  expect(onAction).not.toHaveBeenCalledWith({ type: "send" });
});

test("SIGNIN-12 the device that opened a stale link can only send a new one", () => {
  renderView({ step: "expired", email: EMAIL, onLink: true });

  expect(screen.getByText("Sign-in link")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "This link doesn’t work anymore" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send a new link" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Use a different email" })).not.toBeInTheDocument();
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

test("SIGNIN-13 the signed-out form shows the notice, Sign in again and no guests", () => {
  renderView({ step: "form", email: EMAIL }, { signedOut: SIGNED_OUT });

  expect(screen.getByText("This screen was signed out")).toBeInTheDocument();
  expect(
    screen.getByText("Sign in again to keep the calendar, notes and photos up to date."),
  ).toBeInTheDocument();
  expect(screen.getByText("One account per family")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Sign in again" })).toBeInTheDocument();
  expect(
    screen.getByText(
      "Check your family’s email below. We’ll send a link that signs this screen back in.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveValue(EMAIL);
  expect(screen.queryByRole("button", { name: "Continue as guests" })).not.toBeInTheDocument();
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
  expect(screen.getByRole("button", { name: "Send sign-in link" })).toBeEnabled();

  await userEvent.click(screen.getByRole("button", { name: `Use ${EMAIL}` }));

  expect(onAction).toHaveBeenCalledWith({ type: "email", email: EMAIL });
});

test("SIGNIN-13 another email with nothing waiting shows no warning", () => {
  renderView({ step: "form", email: OTHER }, { signedOut: SIGNED_OUT });

  expect(screen.queryByRole("button", { name: `Use ${EMAIL}` })).not.toBeInTheDocument();
});

test("SIGNIN-13 the notice stays while the link is sending", () => {
  renderView({ step: "sending", email: EMAIL }, { signedOut: SIGNED_OUT });

  expect(screen.getByText("This screen was signed out")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
});
