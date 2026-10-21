import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";
import { Page } from "./Page";

type Options = {
  compact?: boolean;
  leaving?: boolean;
  onBack?: () => void;
  onLeft?: () => void;
};

function renderPage({ compact, leaving, onBack = vi.fn(), onLeft = vi.fn() }: Options = {}) {
  render(
    <>
      <button type="button">Opener</button>
      <Page
        eyebrow="Friday, Oct 9"
        title="Soccer practice"
        backLabel="Back"
        compact={compact}
        leaving={leaving}
        onBack={onBack}
        onLeft={onLeft}
        endActions={<Button>Save</Button>}
      >
        <p>Body</p>
      </Page>
    </>,
  );

  return { onBack, onLeft };
}

test("EVT-01 the page is a modal dialog labelled by its title, with the eyebrow", () => {
  renderPage();

  expect(screen.getByRole("dialog", { name: "Soccer practice" })).toHaveAttribute(
    "aria-modal",
    "true",
  );
  expect(screen.getByText("Friday, Oct 9")).toBeInTheDocument();
});

test("EVT-01 Back and Escape both ask to go back", async () => {
  const { onBack } = renderPage();

  await userEvent.click(screen.getByRole("button", { name: "Back" }));
  await userEvent.keyboard("{Escape}");

  expect(onBack).toHaveBeenCalledTimes(2);
});

test("EVT-01 there is no scrim to tap", () => {
  renderPage();

  expect(screen.getAllByRole("button", { hidden: true })).toHaveLength(3);
});

test("EVT-01 the actions sit in the header, and in the bottom bar on phone", () => {
  renderPage();

  expect(screen.getByRole("button", { name: "Save" }).closest("[data-page-header]")).not.toBeNull();
});

test("EVT-01 on phone the header holds only Back and the title", () => {
  renderPage({ compact: true });

  const save = screen.getByRole("button", { name: "Save" });

  expect(save.closest("[data-page-header]")).toBeNull();
  expect(save.closest("[data-page-bar]")).not.toBeNull();
  expect(screen.getByRole("button", { name: "Back" }).closest("[data-page-header]")).not.toBeNull();
});

test("EVT-01 focus moves into the page when it opens and back to the opener when it goes", () => {
  const opener = document.createElement("button");

  document.body.append(opener);
  opener.focus();

  const { unmount } = render(
    <Page eyebrow="Day" title="Title" backLabel="Back" onBack={() => {}} onLeft={() => {}}>
      <p>Body</p>
    </Page>,
  );

  expect(screen.getByRole("dialog")).toHaveFocus();

  unmount();

  expect(opener).toHaveFocus();
  opener.remove();
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

    const view = render(
      <Page eyebrow="Day" title="Title" backLabel="Back" onBack={() => {}} onLeft={onLeft}>
        <p>Body</p>
      </Page>,
    );

    expect(animate).toHaveBeenLastCalledWith(
      { transform: ["translateX(100%)", "none"] },
      expect.objectContaining({ duration: 280 }),
    );

    view.rerender(
      <Page eyebrow="Day" title="Title" backLabel="Back" onBack={() => {}} leaving onLeft={onLeft}>
        <p>Body</p>
      </Page>,
    );

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
