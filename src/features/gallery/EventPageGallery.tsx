import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import type { Breakpoint } from "@/domain/breakpoint";
import { EventPicker, EventSentence, EventTaskBar, type PageDraft } from "@/features/events";
import { colors, radii } from "@/theme/tokens.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { GalleryGroup } from "./GalleryGroup";
import { GALLERY_FAMILY, gallery } from "./samples";

type SentenceProps = ComponentProps<typeof EventSentence>;

type BarProps = ComponentProps<typeof EventTaskBar>;

type PickerProps = ComponentProps<typeof EventPicker>;

type PickerDemo = { label: string; picker: Partial<PickerProps> & Pick<PickerProps, "word"> };

type Demo = {
  label: string;
  draft: PageDraft;
  sentence?: Partial<SentenceProps>;
  bar?: Partial<BarProps>;
};

const words = gallery.eventPage;

const ignore = () => {};

const BREAKPOINTS: readonly Breakpoint[] = ["large", "normal", "small"];

const ALL_SET = ["day", "start", "end", "who"] as const;

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

const VIEW = { mode: "view", word: null } as const;

const DEMOS: readonly Demo[] = [
  {
    label: words.newEmpty,
    draft: BLANK,
    sentence: { touched: [] },
    bar: { mode: "new", canSave: false },
  },
  { label: words.filled, draft: LUNCH, sentence: { word: "where" }, bar: { mode: "new" } },
  { label: words.allDay, draft: { ...LUNCH, allDay: true }, sentence: { word: "start" } },
  { label: words.noEnd, draft: { ...LUNCH, end: undefined }, sentence: { word: "start" } },
  {
    label: words.longTitle,
    draft: { ...LUNCH, title: words.longTitleText, notes: words.notes },
    sentence: { word: "notes" },
  },
  {
    label: words.view,
    draft: { ...LUNCH, notes: words.notes, notify: false },
    sentence: VIEW,
    bar: { mode: "view", status: { kind: "in", minutes: 169 } },
  },
  {
    label: words.past,
    draft: LUNCH,
    sentence: { ...VIEW, locked: true },
    bar: { mode: "view", status: { kind: "ended" } },
  },
  {
    label: words.clash,
    draft: LUNCH,
    sentence: {
      sameTime: {
        tagIds: FOR_TWO.slice(0, 1),
        title: words.clashTitle,
        start: 690,
        end: 750,
        more: 1,
      },
    },
    bar: { mode: "new" },
  },
  { label: words.deleteAsking, draft: LUNCH, bar: { asking: "delete" } },
  { label: words.discardAsking, draft: LUNCH, bar: { asking: "discard" } },
  { label: words.offline, draft: LUNCH, bar: { mode: "new", online: false } },
  { label: words.scrolled, draft: LUNCH, bar: { mode: "new", scrolled: true } },
];

const picks = gallery.eventPicker;

const EVERYONE = GALLERY_FAMILY.map((tag) => tag.id);

const PICKER_DEMOS: readonly PickerDemo[] = [
  { label: picks.titleEmpty, picker: { word: "title", draft: BLANK } },
  { label: picks.title, picker: { word: "title" } },
  { label: picks.day, picker: { word: "day" } },
  { label: picks.start, picker: { word: "start" } },
  { label: picks.allDay, picker: { word: "start", draft: { ...LUNCH, allDay: true } } },
  { label: picks.start24, picker: { word: "start", clock: "24h" } },
  { label: picks.end, picker: { word: "end" } },
  { label: picks.endNear, picker: { word: "end", draft: { ...LUNCH, start: 750, end: 765 } } },
  { label: picks.who, picker: { word: "who" } },
  { label: picks.everyone, picker: { word: "who", draft: { ...LUNCH, tagIds: EVERYONE } } },
  { label: picks.where, picker: { word: "where" } },
  { label: picks.notes, picker: { word: "notes", draft: { ...LUNCH, notes: picks.notesText } } },
];

const styles = stylex.create({
  demo: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  frames: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 16,
  },
  frame: {
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
  },
});

const frames = stylex.create({
  large: { width: 1920, maxWidth: "100%", padding: 48, gap: 24 },
  normal: { width: 1024, maxWidth: "100%", padding: 24, gap: 16 },
  small: { width: 390, padding: 12, gap: 12 },
});

export function EventPageGallery() {
  return (
    <GalleryGroup title={gallery.groups.eventPage} column>
      {DEMOS.map((demo) => (
        <div key={demo.label} {...stylex.props(styles.demo)}>
          <Eyebrow>{demo.label}</Eyebrow>
          <div {...stylex.props(styles.frames)}>
            {BREAKPOINTS.map((breakpoint) => (
              <Frame key={breakpoint} demo={demo} breakpoint={breakpoint} />
            ))}
          </div>
        </div>
      ))}
    </GalleryGroup>
  );
}

export function EventPickerGallery() {
  return (
    <GalleryGroup title={gallery.groups.eventPicker} column>
      {PICKER_DEMOS.map((demo) => (
        <div key={demo.label} {...stylex.props(styles.demo)}>
          <Eyebrow>{demo.label}</Eyebrow>
          <div {...stylex.props(styles.frames)}>
            {BREAKPOINTS.map((breakpoint) => (
              <div key={breakpoint} {...stylex.props(styles.frame, frames[breakpoint])}>
                <EventPicker
                  breakpoint={breakpoint}
                  draft={LUNCH}
                  today={LUNCH.day}
                  clock="12h"
                  tags={GALLERY_FAMILY}
                  recentTitles={picks.recentTitles}
                  recentPlaces={picks.recentPlaces}
                  onAction={ignore}
                  onCreateTag={() => ""}
                  {...demo.picker}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </GalleryGroup>
  );
}

function Frame({ demo, breakpoint }: { demo: Demo; breakpoint: Breakpoint }) {
  return (
    <div {...stylex.props(styles.frame, frames[breakpoint])}>
      <EventTaskBar
        breakpoint={breakpoint}
        mode="edit"
        asking="none"
        canSave
        online
        onSave={ignore}
        onClose={ignore}
        onEdit={ignore}
        onAskDelete={ignore}
        onKeep={ignore}
        onDelete={ignore}
        onKeepEditing={ignore}
        onDiscard={ignore}
        {...demo.bar}
      />
      <EventSentence
        breakpoint={breakpoint}
        mode="edit"
        draft={demo.draft}
        tags={GALLERY_FAMILY}
        touched={ALL_SET}
        word="title"
        clock="12h"
        onSelect={ignore}
        onAddEnd={ignore}
        onNotify={ignore}
        {...demo.sentence}
      />
    </div>
  );
}
