import { useState } from "react";
import { copy } from "@/copy";
import type { DetailsStatus } from "@/domain/eventStatus";
import type { Tag, TagColor } from "@/domain/schemas";
import { type Clock, formatDayTitle } from "@/domain/time";
import {
  EventSheet,
  type EventSheetState,
  initialEventSheet,
  newEventDraft,
  type SheetForecast,
} from "@/features/events";
import { Button } from "@/ui/Button";
import { GalleryGroup } from "./GalleryGroup";
import { GALLERY_FAMILY, GALLERY_TZ, gallery, NOW } from "./samples";

type Demo = {
  label: string;
  mode: "new" | "edit";
  time?: "start" | "end" | "error" | "noend";
  clock?: Clock;
  offline?: boolean;
  compact?: boolean;
  discard?: boolean;
  allDay?: true;
  tags?: true;
  one?: true;
  details?: true;
  status?: DetailsStatus;
  nobody?: true;
  typed?: string;
  noForecast?: true;
};

const words = gallery.eventSheet;

const DEMOS: readonly Demo[] = [
  { label: words.edit, mode: "edit" },
  { label: words.new, mode: "new" },
  { label: words.start, mode: "edit", time: "start" },
  { label: words.start24, mode: "edit", time: "start", clock: "24h" },
  { label: words.end, mode: "edit", time: "end" },
  { label: words.error, mode: "edit", time: "error" },
  { label: words.noEnd, mode: "edit", time: "noend" },
  { label: words.offline, mode: "new", offline: true },
  { label: words.phone, mode: "edit", time: "end", compact: true },
  { label: words.discardNew, mode: "new", discard: true },
  { label: words.discardEdit, mode: "edit", discard: true, compact: true },
  { label: words.allDay, mode: "edit", allDay: true },
  { label: words.allDayPhone, mode: "edit", allDay: true, compact: true },
  { label: words.tags, mode: "edit", tags: true },
  { label: words.tagsPhone, mode: "edit", tags: true, compact: true },
  { label: words.details, mode: "edit", details: true, tags: true },
  { label: words.detailsOne, mode: "edit", details: true, one: true },
  { label: words.detailsNow, mode: "edit", details: true, status: "now" },
  { label: words.detailsEnded, mode: "edit", details: true, tags: true, status: "ended" },
  { label: words.detailsAllDay, mode: "edit", details: true, allDay: true },
  { label: words.detailsPhone, mode: "edit", details: true, tags: true, compact: true },
  { label: words.detailsDiscard, mode: "edit", details: true, discard: true },
  { label: words.nobody, mode: "edit", nobody: true },
  { label: words.suggestions, mode: "edit", one: true, typed: "mi" },
  { label: words.newMember, mode: "edit", tags: true, typed: "Grandma" },
  { label: words.newMemberPhone, mode: "edit", tags: true, typed: "Grandma", compact: true },
  { label: words.noForecast, mode: "edit", noForecast: true },
];

const FORECAST: SheetForecast = {
  icon: "cloud-sun",
  label: copy.weather.icon["cloud-sun"],
  high: "68°",
};

const FAMILY_IDS = GALLERY_FAMILY.map((tag) => tag.id);

const LUNCH = {
  title: "Lunch with Aunt Rosa",
  start: 720,
  end: 780,
  location: "Café Lumen",
  tagIds: FAMILY_IDS,
  notes: "",
};

const FOR_TWO = {
  tagIds: GALLERY_FAMILY.slice(1, 3).map((tag) => tag.id),
  notes: "Bring the birthday card",
};

const FOR_ONE = {
  tagIds: GALLERY_FAMILY.slice(0, 1).map((tag) => tag.id),
};

const NOBODY = { tagIds: [] };

export function EventSheetGallery() {
  const [open, setOpen] = useState<Demo | null>(null);

  const [added, setAdded] = useState<Tag[]>([]);

  const close = () => setOpen(null);

  const draft = open?.mode === "new" ? newEventDraft(NOW, GALLERY_TZ, FAMILY_IDS) : LUNCH;

  const allDay = open?.allDay && { allDay: open.allDay };

  const tags = (open?.tags && FOR_TWO) || (open?.one && FOR_ONE) || (open?.nobody && NOBODY);

  const initial = open
    ? initialEventSheet({ ...draft, ...allDay, ...tags }, open.time, open.discard, open.details)
    : undefined;

  const createTag = (name: string, color: TagColor) => {
    const tag = { id: `gallery-${added.length}`, name, color, createdAt: NOW.toISOString() };

    setAdded([...added, tag]);

    return tag.id;
  };

  return (
    <GalleryGroup title={gallery.groups.eventSheet}>
      {DEMOS.map((demo) => (
        <Button key={demo.label} variant="secondary" onClick={() => setOpen(demo)}>
          {demo.label}
        </Button>
      ))}
      {open && initial && (
        <EventSheet
          key={open.label}
          mode={open.mode}
          eyebrow={formatDayTitle(NOW, GALLERY_TZ)}
          forecast={open.noForecast ? undefined : FORECAST}
          initial={typedWho(initial, open.typed)}
          clock={open.clock ?? "12h"}
          tags={[...GALLERY_FAMILY, ...added]}
          offline={open.offline ?? false}
          status={open.status}
          compact={open.compact}
          onClose={close}
          onDelete={close}
          onSave={() => {}}
          onCreateTag={createTag}
        />
      )}
    </GalleryGroup>
  );
}

function typedWho(initial: EventSheetState, typed?: string): EventSheetState {
  if (typed === undefined || initial.step === "details") return initial;

  return { ...initial, whoInput: typed };
}
