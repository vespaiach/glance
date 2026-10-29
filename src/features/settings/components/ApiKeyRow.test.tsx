import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { ApiKeyRow } from "./ApiKeyRow";

type Props = ComponentProps<typeof ApiKeyRow>;

const KEY = "glc_live_abcdefghijklmnopqrstuvwxyz012345";

const SAVED = { tail: "7f2c", used: "· Used 2 hr ago" };

function renderRow(overrides: Partial<Props> = {}) {
  const props: Props = {
    host: "glance.example",
    online: true,
    saved: null,
    row: { kind: "idle" },
    onCreate: vi.fn(),
    onCopy: vi.fn(),
    onDone: vi.fn(),
    onAsk: vi.fn(),
    onCancel: vi.fn(),
    onRevoke: vi.fn(),
    ...overrides,
  };

  render(<ApiKeyRow {...props} />);

  return props;
}

test("SET-19 with no key the row shows the endpoint and Create key", async () => {
  const props = renderRow();

  expect(
    screen.getByText("GET · POST · PATCH · DELETE glance.example/api/v1/events"),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Create key" }));

  expect(props.onCreate).toHaveBeenCalledOnce();
});

test("SET-19 Create key is disabled while the key is being made", () => {
  renderRow({ row: { kind: "creating" } });

  expect(screen.getByRole("button", { name: "Create key" })).toBeDisabled();
});

test("SET-19 a created key is shown in full with Copy and Done", async () => {
  const props = renderRow({ saved: SAVED, row: { kind: "shown", key: KEY, copied: false } });

  expect(screen.getByText("Copy this key now")).toBeInTheDocument();
  expect(screen.getByText(KEY)).toBeInTheDocument();
  expect(screen.queryByText(/glc_live_••••/)).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Copy" }));
  await userEvent.click(screen.getByRole("button", { name: "Done" }));

  expect(props.onCopy).toHaveBeenCalledOnce();
  expect(props.onDone).toHaveBeenCalledOnce();
});

test("SET-19 after Copy the button reads Copied", () => {
  renderRow({ saved: SAVED, row: { kind: "shown", key: KEY, copied: true } });

  expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
});

test("SET-19 with a key the row shows the masked key and its last use, and no Create key", () => {
  renderRow({ saved: SAVED });

  expect(screen.getByText("glc_live_••••7f2c")).toBeInTheDocument();
  expect(screen.getByText("· Used 2 hr ago")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Create key" })).not.toBeInTheDocument();
});

test("SET-19 Revoke asks first", async () => {
  const props = renderRow({ saved: SAVED });

  await userEvent.click(screen.getByRole("button", { name: "Revoke" }));

  expect(props.onAsk).toHaveBeenCalledOnce();
});

test("SET-19 the question keeps the masked key and Cancel answers it", async () => {
  const props = renderRow({ saved: SAVED, row: { kind: "asking" } });

  expect(screen.getByText("Apps using this key stop working right away.")).toBeInTheDocument();
  expect(screen.getByText("glc_live_••••7f2c")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Revoke" })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(props.onCancel).toHaveBeenCalledOnce();
});

test("SET-19 Revoke key revokes", async () => {
  const props = renderRow({ saved: SAVED, row: { kind: "asking" } });

  await userEvent.click(screen.getByRole("button", { name: "Revoke key" }));

  expect(props.onRevoke).toHaveBeenCalledOnce();
});

test("SET-19 offline Create key is disabled with the reason", () => {
  renderRow({ online: false });

  expect(screen.getByRole("button", { name: "Create key" })).toBeDisabled();
  expect(screen.getByText("Offline · needs a connection")).toBeInTheDocument();
});

test("SET-19 offline Revoke is disabled", () => {
  renderRow({ online: false, saved: SAVED });

  expect(screen.getByRole("button", { name: "Revoke" })).toBeDisabled();
});
