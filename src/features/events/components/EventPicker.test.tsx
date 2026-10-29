import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import type { Tag } from "@/domain/schemas";
import type { PageDraft } from "../eventPage";
import { EventPicker } from "./EventPicker";

type Props = ComponentProps<typeof EventPicker>;

const tag = (n: number, name: string, color: Tag["color"]): Tag => ({
  id: `tag-${n}`,
  name,
  color,
  createdAt: `2026-10-0${n}T15:00:00.000Z`,
});

const TAGS = [tag(1, "Minh-An", "lilac"), tag(2, "Minh-Hy", "sky"), tag(3, "Mom", "coral")];

const DRAFT: PageDraft = {
  title: "Soccer",
  day: "2026-10-09",
  start: 660,
  end: 720,
  location: "",
  tagIds: ["tag-1"],
  notes: "",
  notify: true,
};

function renderPicker(props: Partial<Props> = {}) {
  const handlers = { onAction: vi.fn(), onCreateTag: vi.fn(() => "tag-new") };

  render(
    <EventPicker
      breakpoint="large"
      word="title"
      draft={DRAFT}
      today="2026-10-09"
      clock="12h"
      tags={TAGS}
      recentTitles={["Swim practice", "Dentist"]}
      recentPlaces={["Home", "School"]}
      {...handlers}
      {...props}
    />,
  );

  return handlers;
}

describe("EventPicker", () => {
  it("EVT-12 typing the title calls back without line breaks", async () => {
    const { onAction } = renderPicker({ draft: { ...DRAFT, title: "" } });

    await userEvent.type(screen.getByRole("textbox", { name: "What’s happening" }), "S");

    expect(onAction).toHaveBeenCalledWith({ type: "title", value: "S" });
  });

  it("EVT-12 Enter in the title goes Next", async () => {
    const { onAction } = renderPicker();

    await userEvent.type(screen.getByRole("textbox", { name: "What’s happening" }), "{Enter}");

    expect(onAction).toHaveBeenCalledWith({ type: "next" });
    expect(onAction).not.toHaveBeenCalledWith(expect.objectContaining({ type: "title" }));
  });

  it("EVT-12 a recent title sets the title and moves to Day", async () => {
    const { onAction } = renderPicker();

    await userEvent.click(screen.getByRole("button", { name: "Dentist" }));

    expect(onAction).toHaveBeenNthCalledWith(1, { type: "title", value: "Dentist" });
    expect(onAction).toHaveBeenNthCalledWith(2, { type: "select", word: "day" });
  });

  it("EVT-12 Next names the next field, reads Next on small and hides on the last field", async () => {
    const { onAction } = renderPicker();

    await userEvent.click(screen.getByRole("button", { name: "Next: Day" }));

    expect(onAction).toHaveBeenCalledWith({ type: "next" });

    renderPicker({ breakpoint: "small", word: "day" });

    expect(screen.getByRole("button", { name: "Next" })).toBeVisible();

    renderPicker({ word: "notes" });

    expect(
      within(screen.getByRole("region", { name: "Notes" })).queryByRole("button", {
        name: /Next/,
      }),
    ).not.toBeInTheDocument();
  });

  it("EVT-12 Next skips Ends with no end", () => {
    renderPicker({ word: "start", draft: { ...DRAFT, end: undefined } });

    expect(screen.getByRole("button", { name: "Next: Who it’s for" })).toBeVisible();
  });

  it("EVT-12 the Day picker shows no Today, Tomorrow or Next week buttons and a day cell still sets the date", async () => {
    const { onAction } = renderPicker({ word: "day" });

    expect(screen.queryByRole("button", { name: /^(Today|Tomorrow|Next week)/ })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Sat, October 10" }));

    expect(onAction).toHaveBeenCalledWith({ type: "day", value: "2026-10-10" });
  });

  it("EVT-12 the How often tabs start on One day and toggle repeat", async () => {
    const { onAction } = renderPicker({ word: "day" });

    const tabs = screen.getByRole("tablist", { name: "How often" });

    expect(within(tabs).getByRole("tab", { name: "One day" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByRole("button", { name: /repeats$/ })).toBeNull();

    await userEvent.click(within(tabs).getByRole("tab", { name: "Every week" }));

    expect(onAction).toHaveBeenCalledWith({ type: "repeat", value: true });
  });

  it("EVT-12 with repeat on the later same-weekday cells are marked as repeats", async () => {
    const { onAction } = renderPicker({ word: "day", draft: { ...DRAFT, repeat: "weekly" } });

    expect(screen.getByRole("tab", { name: "Every week" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("button", { name: "Fri, October 9, today" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Fri, October 16, repeats" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Fri, October 30, repeats" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Sat, October 17" })).toBeVisible();

    await userEvent.click(screen.getByRole("tab", { name: "One day" }));

    expect(onAction).toHaveBeenCalledWith({ type: "repeat", value: false });
  });

  it("EVT-12 the month grid disables past days and starts at this month", async () => {
    const { onAction } = renderPicker({ word: "day" });

    expect(screen.getByRole("button", { name: "Thu, October 8" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fri, October 9, today" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Next month" }));

    expect(screen.getByText("November 2026")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Tue, November 3" }));

    expect(onAction).toHaveBeenCalledWith({ type: "day", value: "2026-11-03" });
  });

  it("TPK-02 TPK-10 an hour or minute cell changes one part and cells use aria-pressed", async () => {
    const { onAction } = renderPicker({ word: "start" });

    expect(screen.getByRole("button", { name: "11 AM" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "3 AM" }));

    await userEvent.click(screen.getByRole("button", { name: "05 minutes" }));

    expect(onAction).toHaveBeenCalledWith({ type: "start", value: 180 });
    expect(onAction).toHaveBeenCalledWith({ type: "start", value: 665 });
  });

  it("TPK-01 the AM/PM toggle keeps the hour and minutes", async () => {
    const { onAction } = renderPicker({ word: "start" });

    await userEvent.click(screen.getByRole("button", { name: "PM" }));

    expect(onAction).toHaveBeenCalledWith({ type: "start", value: 1380 });
  });

  it("TPK-01 Ends shows its length on large and normal only", () => {
    renderPicker({ word: "end" });

    expect(screen.getByRole("region", { name: "Ends · 1 hr" })).toBeVisible();

    renderPicker({ word: "end", breakpoint: "small" });

    expect(screen.getByRole("region", { name: "Ends" })).toBeVisible();
  });

  it("TPK-07 end cells before start + 5 min are disabled and not pickable", async () => {
    const { onAction } = renderPicker({ word: "end", draft: { ...DRAFT, end: 690 } });

    const early = screen.getByRole("button", { name: "10 AM" });

    expect(early).toBeDisabled();
    expect(screen.getByRole("button", { name: "00 minutes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "05 minutes" })).toBeEnabled();

    await userEvent.click(early);

    expect(onAction).not.toHaveBeenCalled();
  });

  it("TPK-04 TPK-08 Length picks a length and No end time clears the end", async () => {
    const { onAction } = renderPicker({ word: "end" });

    expect(screen.getByRole("button", { name: "1 hr" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "1 hr 30" }));

    await userEvent.click(screen.getByRole("button", { name: "No end time" }));

    expect(onAction).toHaveBeenCalledWith({ type: "length", minutes: 90 });
    expect(onAction).toHaveBeenCalledWith({ type: "noEnd" });
  });

  it("EVT-08 the All day chip turns all day on", async () => {
    const { onAction } = renderPicker({ word: "start" });

    await userEvent.click(screen.getByRole("switch", { name: "All day" }));

    expect(onAction).toHaveBeenCalledWith({ type: "allDay", value: true });
  });

  it("EVT-08 all day disables the grids and the toggle with nothing picked", () => {
    renderPicker({ word: "start", draft: { ...DRAFT, allDay: true } });

    expect(screen.getByRole("switch", { name: "All day" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "11 AM" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "11 AM" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "00 minutes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "AM" })).toBeDisabled();
  });

  it("TPK-09 the 24-hour clock shows hours 00 to 23 and no AM/PM toggle", () => {
    renderPicker({ word: "start", clock: "24h" });

    expect(screen.getByRole("button", { name: "00 hundred" })).toBeVisible();
    expect(screen.getByRole("button", { name: "23 hundred" })).toBeVisible();
    expect(screen.getByRole("button", { name: "11 hundred" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByRole("group", { name: "AM or PM" })).not.toBeInTheDocument();
  });

  it("EVT-11 Everyone is picked when every tag is on, and picks every tag", async () => {
    const { onAction } = renderPicker({ word: "who", draft: { ...DRAFT, tagIds: [] } });

    await userEvent.click(screen.getByRole("button", { name: "Everyone" }));

    expect(onAction).toHaveBeenCalledWith({ type: "who", tagIds: ["tag-1", "tag-2", "tag-3"] });

    renderPicker({ word: "who", draft: { ...DRAFT, tagIds: ["tag-1", "tag-2", "tag-3"] } });

    const [, everyone] = screen.getAllByRole("button", { name: "Everyone" });

    expect(everyone).toHaveAttribute("aria-pressed", "true");
  });

  it("EVT-11 a member chip toggles that person", async () => {
    const { onAction } = renderPicker({ word: "who" });

    expect(screen.getByRole("button", { name: "Minh-An" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "Mom" }));

    expect(onAction).toHaveBeenCalledWith({ type: "who", tagIds: ["tag-1", "tag-3"] });
  });

  it("EVT-11 a suggestion or Enter on an exact name puts that person on the event", async () => {
    const { onAction } = renderPicker({ word: "who" });

    const field = screen.getByRole("textbox", { name: "Add a person" });

    await userEvent.type(field, "mo");

    await userEvent.click(
      within(screen.getByRole("group", { name: "Suggestions" })).getByRole("button", {
        name: "Mom",
      }),
    );

    expect(onAction).toHaveBeenCalledWith({ type: "who", tagIds: ["tag-1", "tag-3"] });
    expect(field).toHaveValue("");

    await userEvent.type(field, "minh-hy{Enter}");

    expect(onAction).toHaveBeenCalledWith({ type: "who", tagIds: ["tag-1", "tag-2"] });
  });

  it("FAM-04 Add member creates the member and picks it", async () => {
    const { onAction, onCreateTag } = renderPicker({ word: "who" });

    await userEvent.type(screen.getByRole("textbox", { name: "Add a person" }), "Grandpa");

    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    expect(onCreateTag).toHaveBeenCalledWith("Grandpa", "mint");
    expect(onAction).toHaveBeenCalledWith({ type: "who", tagIds: ["tag-1", "tag-new"] });
  });

  it("EVT-12 Where: Enter goes Next and a recent place sets the place", async () => {
    const { onAction } = renderPicker({ word: "where" });

    await userEvent.type(screen.getByRole("textbox", { name: "Where" }), "{Enter}");

    await userEvent.click(screen.getByRole("button", { name: "School" }));

    expect(onAction).toHaveBeenCalledWith({ type: "next" });
    expect(onAction).toHaveBeenCalledWith({ type: "location", value: "School" });
  });

  it("EVT-12 Notes calls back with the text and takes at most 280 characters", async () => {
    const { onAction } = renderPicker({ word: "notes" });

    const notes = screen.getByRole("textbox", { name: "Notes" });

    await userEvent.type(notes, "B");

    expect(onAction).toHaveBeenCalledWith({ type: "notes", value: "B" });
    expect(notes).toHaveAttribute("maxlength", "280");
  });

  it("EVT-12 a text field gets focus when its word opens", () => {
    renderPicker({ word: "where", draft: { ...DRAFT, location: "Park" } });

    expect(screen.getByRole("textbox", { name: "Where" })).toHaveFocus();
  });
});
