import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { initialEventPage, type OpenEventPage, type PageDraft } from "../eventPage";
import { EventPage } from "./EventPage";

const DRAFT: PageDraft = {
  title: "Lunch",
  day: "2026-10-09",
  start: 720,
  end: 780,
  location: "",
  tagIds: [],
  notes: "",
  notify: true,
};

function renderPage(dispatch = vi.fn()) {
  render(
    <EventPage
      breakpoint="normal"
      state={initialEventPage("new", DRAFT) as OpenEventPage}
      leaving={false}
      tags={[]}
      clock="12h"
      today={DRAFT.day}
      online
      recentTitles={[]}
      recentPlaces={[]}
      dispatch={dispatch}
      onSave={() => {}}
      onDelete={() => {}}
      onLeft={() => {}}
      onCreateTag={() => "tag"}
    />,
  );
}

test("EVT-05 the top bar's Back closes the page", async () => {
  const dispatch = vi.fn();

  renderPage(dispatch);

  await userEvent.click(screen.getByRole("button", { name: "Back" }));

  expect(dispatch).toHaveBeenCalledWith({ type: "close" });
});
