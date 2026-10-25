"use client";

import { useReducer, useState } from "react";
import type { EventWord } from "@/domain/eventSentence";
import type { StatusTitle } from "@/domain/eventStatus";
import type { Tag, TagColor } from "@/domain/schemas";
import {
  DayPreview,
  EventFacts,
  EventPage,
  eventPageReducer,
  initialEventPage,
  type PageDraft,
  type PreviewTile,
} from "@/features/events";
import { useBreakpoint } from "@/shell/breakpoint";
import { Button } from "@/ui/Button";
import { GalleryGroup } from "./GalleryGroup";
import { GALLERY_FAMILY, gallery, NOW } from "./samples";

type Demo = {
  label: string;
  mode: "new" | "edit" | "view";
  draft: PageDraft;
  word?: EventWord;
  status?: StatusTitle;
  offline?: true;
};

const words = gallery.eventFullPage;

const picks = gallery.eventPicker;

const FOR_TWO = GALLERY_FAMILY.slice(1, 3).map((tag) => tag.id);

const LUNCH: PageDraft = {
  title: "Lunch with Aunt Rosa",
  day: "2026-10-09",
  start: 720,
  end: 780,
  location: "Café Lumen",
  tagIds: FOR_TWO,
  notes: "",
  notify: true,
};

const BLANK: PageDraft = { ...LUNCH, title: "", location: "", start: 660, end: 720 };

const DEMOS: readonly Demo[] = [
  { label: words.new, mode: "new", draft: BLANK },
  { label: words.edit, mode: "edit", draft: LUNCH },
  { label: words.allDay, mode: "edit", draft: { ...LUNCH, allDay: true }, word: "start" },
  { label: words.noEnd, mode: "edit", draft: { ...LUNCH, end: undefined }, word: "start" },
  { label: words.day, mode: "edit", draft: LUNCH, word: "day" },
  { label: words.end, mode: "edit", draft: LUNCH, word: "end" },
  { label: words.who, mode: "edit", draft: LUNCH, word: "who" },
  { label: words.where, mode: "edit", draft: LUNCH, word: "where" },
  { label: words.notes, mode: "edit", draft: LUNCH, word: "notes" },
  { label: words.offline, mode: "new", draft: BLANK, offline: true },
  { label: words.view, mode: "view", draft: LUNCH, status: { kind: "in", minutes: 169 } },
  { label: words.past, mode: "view", draft: LUNCH, status: { kind: "ended" } },
  {
    label: words.viewAllDay,
    mode: "view",
    draft: { ...LUNCH, allDay: true },
    status: { kind: "inDays", days: 7 },
  },
];

const PREVIEW_WEATHER: PreviewTile = {
  icon: "cloud-sun",
  temp: "66°",
  condition: "Partly cloudy",
  hours: [
    { time: "12 PM", icon: "cloud-sun", temp: "66°", label: "12 PM, Partly cloudy, 66 degrees" },
    { time: "1 PM", icon: "cloud", temp: "67°", label: "1 PM, Cloudy, 67 degrees" },
  ],
};

const PREVIEW_PLANS = [{ id: "a", time: "12:30 PM – 1:30 PM", title: "Piano lesson", who: "Mia" }];

export function EventFullPageGallery() {
  const [open, setOpen] = useState<Demo | null>(null);

  return (
    <GalleryGroup title={gallery.groups.eventSheet}>
      {DEMOS.map((demo) => (
        <Button key={demo.label} variant="secondary" onClick={() => setOpen(demo)}>
          {demo.label}
        </Button>
      ))}
      {open && <DemoPage key={open.label} demo={open} onLeft={() => setOpen(null)} />}
    </GalleryGroup>
  );
}

function DemoPage({ demo, onLeft }: { demo: Demo; onLeft: () => void }) {
  const [state, dispatch] = useReducer(
    eventPageReducer,
    initialEventPage(demo.mode, demo.draft, demo.word),
  );

  const [shown, setShown] = useState(state);

  const [added, setAdded] = useState<Tag[]>([]);

  const breakpoint = useBreakpoint();

  if (state.mode !== "closed" && state !== shown) setShown(state);

  if (shown.mode === "closed") return null;

  const createTag = (name: string, color: TagColor) => {
    const tag = { id: `gallery-${added.length}`, name, color, createdAt: NOW.toISOString() };

    setAdded([...added, tag]);

    return tag.id;
  };

  return (
    <EventPage
      breakpoint={breakpoint}
      state={shown}
      leaving={state.mode === "closed"}
      tags={[...GALLERY_FAMILY, ...added]}
      clock="12h"
      today={LUNCH.day}
      online={!demo.offline}
      status={demo.status}
      sameTime={{
        tagIds: FOR_TWO.slice(0, 1),
        title: "Piano lesson",
        start: 750,
        end: 810,
        more: 0,
      }}
      recentTitles={picks.recentTitles}
      recentPlaces={picks.recentPlaces}
      preview={
        <DayPreview label={words.previewLabel} weather={PREVIEW_WEATHER} plans={PREVIEW_PLANS} />
      }
      facts={
        <EventFacts
          breakpoint={breakpoint}
          day={words.factsDay}
          scope={shown.mode === "view" && shown.opened.allDay ? "day" : "time"}
          weather={PREVIEW_WEATHER}
          plans={shown.mode === "view" && shown.opened.allDay ? [] : PREVIEW_PLANS}
        />
      }
      dispatch={dispatch}
      onSave={() => dispatch({ type: "saved" })}
      onDelete={() => dispatch({ type: "deleted" })}
      onLeft={onLeft}
      onCreateTag={createTag}
    />
  );
}
