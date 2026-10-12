import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import type { SignInState } from "../signIn";
import { SignInView } from "./SignInView";

type Props = ComponentProps<typeof SignInView>;

const EMAIL = "maria@example.com";

const NOW = new Date(2026, 9, 9, 10, 41);

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
      season="fall"
      time={NOW}
      clock="12h"
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

test("SIGNIN-01 the email form asks for an email with Send sign-in link and Continue as demo", () => {
  renderView({ step: "form", email: "" });

  expect(screen.getByText("One account per family")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Sign in or get started" })).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveAttribute("placeholder", "name@example.com");
  expect(screen.getByRole("button", { name: "Send sign-in link" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Continue as demo" })).toBeInTheDocument();
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
  expect(screen.queryByRole("button", { name: "Continue as demo" })).not.toBeInTheDocument();
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

test("SIGNIN-05 Continue as demo goes out as onDemo", async () => {
  const { onDemo } = renderView({ step: "form", email: "" });

  await userEvent.click(screen.getByRole("button", { name: "Continue as demo" }));

  expect(onDemo).toHaveBeenCalled();
});

test("SIGNIN-05 Continue as demo is hidden outside demo builds", () => {
  renderView({ step: "form", email: "" }, { demo: false });

  expect(screen.queryByRole("button", { name: "Continue as demo" })).not.toBeInTheDocument();
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

test("SIGNIN-07 Finish on your phone waits for the name", async () => {
  const { onFinishedOnPhone } = renderView({ step: "phone", email: EMAIL });

  expect(screen.getByRole("heading", { name: "Finish on your phone" })).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Waiting for your name");

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
