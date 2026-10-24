import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { SignOutDialog } from "./SignOutDialog";

type Props = ComponentProps<typeof SignOutDialog>;

function renderDialog(overrides: Partial<Props> = {}): Props {
  const props: Props = {
    email: "maria@example.com",
    online: true,
    state: { kind: "open" },
    onThisDevice: vi.fn(),
    onAllDevices: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };

  render(<SignOutDialog {...props} />);

  return props;
}

test("SIGNIN-11 shows the email, the title and both choices", () => {
  renderDialog();

  const dialog = screen.getByRole("dialog", { name: "Sign out" });

  expect(dialog).toHaveTextContent("maria@example.com");
  expect(screen.getByRole("button", { name: "Sign out this device" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Sign out all devices" })).toBeEnabled();
});

test("SIGNIN-11 Sign out this device signs out only this screen", async () => {
  const props = renderDialog();

  await userEvent.click(screen.getByRole("button", { name: "Sign out this device" }));

  expect(props.onThisDevice).toHaveBeenCalledOnce();
  expect(props.onAllDevices).not.toHaveBeenCalled();
});

test("SIGNIN-11 Sign out all devices signs out every device", async () => {
  const props = renderDialog();

  await userEvent.click(screen.getByRole("button", { name: "Sign out all devices" }));

  expect(props.onAllDevices).toHaveBeenCalledOnce();
  expect(props.onThisDevice).not.toHaveBeenCalled();
});

test("SIGNIN-11 Cancel closes the dialog", async () => {
  const props = renderDialog();

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(props.onCancel).toHaveBeenCalledOnce();
});

test("SIGNIN-11 a scrim tap closes the dialog", async () => {
  const props = renderDialog();

  await userEvent.click(screen.getByTestId("dialog-scrim"));

  expect(props.onCancel).toHaveBeenCalledOnce();
});

test("SIGNIN-11 Escape closes the dialog", () => {
  const props = renderDialog();

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

  expect(props.onCancel).toHaveBeenCalledOnce();
});

test("SIGNIN-11 offline, Sign out all devices is disabled", () => {
  renderDialog({ online: false });

  expect(screen.getByRole("button", { name: "Sign out all devices" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Sign out this device" })).toBeEnabled();
});

test("SIGNIN-11 a failed request shows the error under the buttons", () => {
  renderDialog({ state: { kind: "failed" } });

  expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t sign out. Try again.");
});

test("SIGNIN-11 while signing out every device both sign-out buttons wait", () => {
  renderDialog({ state: { kind: "signing-out" } });

  expect(screen.getByRole("button", { name: "Sign out all devices" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Sign out this device" })).toBeDisabled();
});
