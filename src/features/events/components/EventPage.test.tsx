import { fireEvent, render, screen } from "@testing-library/react";
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

const SCROLLED = "EventTaskBar__styles.scrolled";

function renderPage() {
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
      dispatch={() => {}}
      onSave={() => {}}
      onDelete={() => {}}
      onLeft={() => {}}
      onCreateTag={() => "tag"}
    />,
  );
}

function scrollTo(top: number) {
  const page = screen.getByRole("dialog");

  page.scrollTop = top;
  fireEvent.scroll(page);
}

test("EVT-05 the task bar gets the scrolled state after a scroll and loses it back at the top", () => {
  renderPage();

  const bar = screen.getByRole("button", { name: "Close" }).parentElement;

  expect(bar).not.toHaveClass(SCROLLED);

  scrollTo(120);

  expect(bar).toHaveClass(SCROLLED);

  scrollTo(0);

  expect(bar).not.toHaveClass(SCROLLED);
});
