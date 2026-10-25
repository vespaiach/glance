import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Page } from "./Page";

type Options = {
  leaving?: boolean;
  onEscape?: () => void;
  onLeft?: () => void;
};

function Focused() {
  return <input aria-label="Title" ref={(input) => input?.focus()} />;
}

function renderPage({ leaving, onEscape = vi.fn(), onLeft = vi.fn() }: Options = {}) {
  render(
    <>
      <button type="button">Opener</button>
      <Page
        label="New event"
        breakpoint="large"
        leaving={leaving}
        onEscape={onEscape}
        onLeft={onLeft}
      >
        <p>Body</p>
      </Page>
    </>,
  );

  return { onEscape, onLeft };
}

test("EVT-01 the page is a modal dialog named by its label", () => {
  renderPage();

  expect(screen.getByRole("dialog", { name: "New event" })).toHaveAttribute("aria-modal", "true");
});

test("EVT-05 Escape asks to close", async () => {
  const { onEscape } = renderPage();

  await userEvent.keyboard("{Escape}");

  expect(onEscape).toHaveBeenCalledTimes(1);
});

test("EVT-01 there is no scrim to tap", () => {
  renderPage();

  expect(screen.getAllByRole("button", { hidden: true })).toHaveLength(1);
});

test("EVT-01 focus moves into the page when it opens and back to the opener when it goes", () => {
  const opener = document.createElement("button");

  document.body.append(opener);
  opener.focus();

  const { unmount } = render(
    <Page label="Title" breakpoint="normal" onEscape={() => {}} onLeft={() => {}}>
      <p>Body</p>
    </Page>,
  );

  expect(screen.getByRole("dialog")).toHaveFocus();

  unmount();

  expect(opener).toHaveFocus();
  opener.remove();
});

test("EVT-12 a field that takes focus as the page opens keeps it", () => {
  render(
    <Page label="New event" breakpoint="small" onEscape={() => {}} onLeft={() => {}}>
      <Focused />
    </Page>,
  );

  expect(screen.getByLabelText("Title")).toHaveFocus();
});

test("EVT-01 a page that is leaving reports it has left once", () => {
  const { onLeft } = renderPage({ leaving: true });

  expect(onLeft).toHaveBeenCalledTimes(1);
});

test("EVT-01 a page that is not leaving stays", () => {
  const { onLeft } = renderPage();

  expect(onLeft).not.toHaveBeenCalled();
});

test("EVT-01 the page slides in from the right and out to the right, reporting once it has gone", async () => {
  let finish: () => void = () => {};

  const animate = vi.fn(() => ({ finished: new Promise<void>((resolve) => (finish = resolve)) }));

  HTMLElement.prototype.animate = animate as unknown as typeof HTMLElement.prototype.animate;

  try {
    const onLeft = vi.fn();

    const page = (leaving: boolean) => (
      <Page label="Title" breakpoint="large" onEscape={() => {}} leaving={leaving} onLeft={onLeft}>
        <p>Body</p>
      </Page>
    );

    const view = render(page(false));

    expect(animate).toHaveBeenLastCalledWith(
      { transform: ["translateX(100%)", "none"] },
      expect.objectContaining({ duration: 280 }),
    );

    view.rerender(page(true));

    expect(animate).toHaveBeenLastCalledWith(
      { transform: ["none", "translateX(100%)"] },
      expect.objectContaining({ duration: 280 }),
    );
    expect(onLeft).not.toHaveBeenCalled();

    finish();

    await waitFor(() => expect(onLeft).toHaveBeenCalledTimes(1));
  } finally {
    Reflect.deleteProperty(HTMLElement.prototype, "animate");
  }
});
