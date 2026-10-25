import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import type { Tag } from "@/domain/schemas";
import type { PageDraft } from "../eventPage";
import { EventSentence } from "./EventSentence";

type Props = ComponentProps<typeof EventSentence>;

const tag = (n: number, name: string, color: Tag["color"]): Tag => ({
  id: `0195f0a0-0000-7000-8000-00000000050${n}`,
  name,
  color,
  createdAt: `2026-10-0${n}T15:00:00.000Z`,
});

const MOM = tag(1, "Mom", "coral");

const DAD = tag(2, "Dad", "mint");

const KID = tag(3, "Kid", "sky");

const GRAN = tag(4, "Gran", "sun");

const FAMILY = [MOM, DAD, KID, GRAN];

const LUNCH: PageDraft = {
  title: "Lunch with Aunt Rosa",
  day: "2026-10-09",
  start: 720,
  end: 780,
  location: "Café Lumen",
  tagIds: [MOM.id, DAD.id],
  notes: "",
  notify: true,
};

const BLANK: PageDraft = { ...LUNCH, title: "", location: "" };

const ALL_SET = ["day", "start", "end", "who"] as const;

function renderSentence(props: Partial<Props> = {}) {
  const onSelect = vi.fn();
  const onAddEnd = vi.fn();
  const onNotify = vi.fn();

  render(
    <EventSentence
      breakpoint="large"
      mode="edit"
      draft={LUNCH}
      tags={FAMILY}
      touched={ALL_SET}
      word="title"
      clock="12h"
      onSelect={onSelect}
      onAddEnd={onAddEnd}
      onNotify={onNotify}
      {...props}
    />,
  );

  return { onSelect, onAddEnd, onNotify };
}

describe("EventSentence", () => {
  it("EVT-02 Enter and Space on a word select its picker", async () => {
    const { onSelect } = renderSentence();

    screen.getByRole("button", { name: "Day: Fri, Oct 9. Change" }).focus();

    await userEvent.keyboard("{Enter}");

    screen.getByRole("button", { name: "Where: Café Lumen. Change" }).focus();

    await userEvent.keyboard(" ");

    expect(onSelect.mock.calls).toEqual([["day"], ["where"]]);
  });

  it("EVT-02 a tap on a word selects it", async () => {
    const { onSelect } = renderSentence();

    await userEvent.click(screen.getByRole("button", { name: "Starts: 12:00 PM. Change" }));

    expect(onSelect).toHaveBeenCalledWith("start");
  });

  it("EVT-02 names set words with their value and placeholders as not set", () => {
    renderSentence({ draft: BLANK, touched: [] });

    const names = screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"))
      .filter((name) => name?.endsWith(". Change"));

    expect(names).toEqual([
      "What’s happening: not set. Change",
      "Day: not set. Change",
      "Starts: not set. Change",
      "Ends: not set. Change",
      "Who it’s for: not set. Change",
      "Where: not set. Change",
    ]);
  });

  it("EVT-02 reads the sentence with its joins", () => {
    renderSentence();

    expect(screen.getByLabelText("Event summary")).toHaveTextContent(
      "Lunch with Aunt Rosa on Fri, Oct 9 from 12:00 PM to 1:00 PM for Mom and Dad at Café Lumen.",
    );
  });

  it("EVT-02 EVT-08 all day reads all day and has no Ends word", () => {
    renderSentence({ draft: { ...LUNCH, allDay: true, tagIds: FAMILY.map((one) => one.id) } });

    expect(screen.getByLabelText("Event summary")).toHaveTextContent(
      "Lunch with Aunt Rosa on Fri, Oct 9, all day, for everyone at Café Lumen.",
    );
  });

  it("EVT-02 TPK-08 no end reads at the start and Add end time adds one", async () => {
    const { onAddEnd } = renderSentence({ draft: { ...LUNCH, end: undefined } });

    expect(screen.getByLabelText("Event summary")).toHaveTextContent(
      "on Fri, Oct 9 at 12:00 PM for",
    );

    await userEvent.click(screen.getByRole("button", { name: "Add end time" }));

    expect(onAddEnd).toHaveBeenCalled();
  });

  it("EVT-02 who names three people as a, b and c", () => {
    renderSentence({ draft: { ...LUNCH, tagIds: [MOM.id, DAD.id, KID.id] } });

    expect(screen.getByRole("button", { name: /^Who it’s for/ })).toHaveTextContent(
      "Mom, Dad and Kid",
    );
  });

  it("EVT-02 the Notes link reads Add notes, then the first 25 characters, and selects Notes", async () => {
    const { onSelect } = renderSentence();

    await userEvent.click(screen.getByRole("button", { name: "Add notes" }));

    expect(onSelect).toHaveBeenCalledWith("notes");
  });

  it("EVT-02 a long note shows its first 25 characters", () => {
    renderSentence({ draft: { ...LUNCH, notes: "Bring the birthday card and the cake" } });

    expect(screen.getByRole("button", { name: "Notes: Bring the birthday card a…" })).toBeVisible();
  });

  it("NOTIF-09 the switch is a role switch named by its state", async () => {
    const { onNotify } = renderSentence();

    const toggle = screen.getByRole("switch", { name: "Notification on. Turn off" });

    expect(toggle).toHaveAttribute("aria-checked", "true");

    await userEvent.click(toggle);

    expect(onNotify).toHaveBeenCalledWith(false);
  });

  it("NOTIF-09 small shows the bell named by its state", async () => {
    const { onNotify } = renderSentence({
      breakpoint: "small",
      draft: { ...LUNCH, notify: false },
    });

    expect(screen.queryByRole("switch")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Notification off. Turn on" }));

    expect(onNotify).toHaveBeenCalledWith(true);
  });

  it("EVT-13 the Same time line shows on normal only", () => {
    const sameTime = { tagIds: [MOM.id], title: "Soccer", start: 690, end: 750, more: 1 };

    renderSentence({ breakpoint: "normal", sameTime });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Same time: Mom is also at Soccer, 11:30 AM – 12:30 PM · 1 more",
    );
  });

  it("EVT-13 the Same time line is hidden on large", () => {
    const sameTime = { tagIds: [MOM.id], title: "Soccer", start: 690, end: 750, more: 0 };

    renderSentence({ sameTime });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("EVT-09 view mode names words to edit and has no link row", async () => {
    const { onSelect } = renderSentence({ mode: "view", word: null });

    await userEvent.click(screen.getByRole("button", { name: "Who it’s for: Dad. Edit" }));

    expect(onSelect).toHaveBeenCalledWith("who");
    expect(screen.queryByRole("button", { name: "Add notes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("EVT-09 view mode leaves out a missing place and shows Notification off", () => {
    renderSentence({ mode: "view", word: null, draft: { ...LUNCH, location: "", notify: false } });

    expect(screen.getByLabelText("Event summary")).toHaveTextContent("for Mom and Dad.");
    expect(screen.getByText("Notification off")).toBeVisible();
  });

  it("EVT-09 an ended event has no tappable words and shows the lock line", () => {
    renderSentence({ mode: "view", word: null, locked: true });

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText("This event has ended and can’t be changed.")).toBeVisible();
  });
});
