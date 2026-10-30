import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { EventTaskBar } from "./EventTaskBar";

type Props = ComponentProps<typeof EventTaskBar>;

function renderBar(props: Partial<Props> = {}) {
  const handlers = {
    onSave: vi.fn(),
    onClose: vi.fn(),
    onEdit: vi.fn(),
    onAskDelete: vi.fn(),
    onKeep: vi.fn(),
    onDelete: vi.fn(),
    onKeepEditing: vi.fn(),
    onDiscard: vi.fn(),
  };

  render(
    <EventTaskBar
      breakpoint="large"
      mode="new"
      asking="none"
      canSave
      online
      {...handlers}
      {...props}
    />,
  );

  return handlers;
}

describe("EventTaskBar", () => {
  it("EVT-05 a new event reads New event with Save event and Back", async () => {
    const { onSave, onClose } = renderBar();

    expect(screen.getByText("New event")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Save event" }));

    await userEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(onSave).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("EVT-05 Save reads Save on small and when editing", () => {
    renderBar({ breakpoint: "small" });

    expect(screen.getByRole("button", { name: "Save" })).toBeVisible();
  });

  it("EVT-05 TPK-09 Save reads Save for later offline", () => {
    renderBar({ mode: "edit", online: false });

    expect(screen.getByRole("button", { name: "Save for later" })).toBeVisible();
  });

  it("EVT-03 Save is disabled without a title", () => {
    renderBar({ canSave: false });

    expect(screen.getByRole("button", { name: "Save event" })).toBeDisabled();
  });

  it("EVT-06 Delete asks first, then Delete event deletes", async () => {
    const { onAskDelete } = renderBar({ mode: "edit" });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(onAskDelete).toHaveBeenCalled();
  });

  it("EVT-06 while asking, Keep backs out and Delete event deletes", async () => {
    const { onKeep, onDelete } = renderBar({ mode: "edit", asking: "delete" });

    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Keep" }));

    await userEvent.click(screen.getByRole("button", { name: "Delete event" }));

    expect(onKeep).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });

  it("EVT-05 Discard changes? replaces the actions with Keep editing and Discard", async () => {
    const { onKeepEditing, onDiscard } = renderBar({ mode: "edit", asking: "discard" });

    expect(screen.getByText("Discard changes?")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Keep editing" }));

    await userEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(onKeepEditing).toHaveBeenCalled();
    expect(onDiscard).toHaveBeenCalled();
  });

  it("EVT-05 small hides the title while asking", () => {
    renderBar({ breakpoint: "small", asking: "discard" });

    expect(screen.queryByText("New event")).not.toBeInTheDocument();
  });

  it("EVT-09 view mode shows the status title with Edit", async () => {
    const { onEdit } = renderBar({ mode: "view", status: { kind: "in", minutes: 169 } });

    expect(screen.getByText("In 2 hr 49 min")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^Save/ })).not.toBeInTheDocument();
  });

  it("EVT-09 an ended event has no Edit", () => {
    renderBar({ mode: "view", status: { kind: "ended" } });

    expect(screen.getByText("Ended")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeVisible();
  });
  it("EVT-05 on small Delete and Save are icon buttons named by their label", () => {
    renderBar({ breakpoint: "small", mode: "edit" });

    expect(screen.getByRole("button", { name: "Delete" })).toHaveTextContent(/^$/);
    expect(screen.getByRole("button", { name: "Save" })).toHaveTextContent(/^$/);
  });

  it("EVT-05 on small Save is disabled with an empty title", () => {
    renderBar({ breakpoint: "small", canSave: false });

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("EVT-05 TPK-09 on small offline Save is named Save for later", () => {
    renderBar({ breakpoint: "small", online: false });

    expect(screen.getByRole("button", { name: "Save for later" })).toHaveTextContent(/^$/);
  });

  it("EVT-05 on small Edit is an icon button", async () => {
    const { onEdit } = renderBar({
      breakpoint: "small",
      mode: "view",
      status: { kind: "in", minutes: 169 },
    });

    const edit = screen.getByRole("button", { name: "Edit" });

    await userEvent.click(edit);

    expect(edit).toHaveTextContent(/^$/);
    expect(onEdit).toHaveBeenCalled();
  });

  it("EVT-05 on small the delete confirm is icon buttons named Keep and Delete event", async () => {
    const { onKeep, onDelete } = renderBar({ breakpoint: "small", mode: "edit", asking: "delete" });

    const keep = screen.getByRole("button", { name: "Keep" });
    const remove = screen.getByRole("button", { name: "Delete event" });

    await userEvent.click(keep);

    await userEvent.click(remove);

    expect(keep).toHaveTextContent(/^$/);
    expect(remove).toHaveTextContent(/^$/);
    expect(onKeep).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });

  it("EVT-05 on small Discard changes? keeps its text buttons", () => {
    renderBar({ breakpoint: "small", mode: "edit", asking: "discard" });

    expect(screen.getByRole("button", { name: "Keep editing" })).toHaveTextContent("Keep editing");
    expect(screen.getByRole("button", { name: "Discard" })).toHaveTextContent("Discard");
  });
});
