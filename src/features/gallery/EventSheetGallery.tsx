import { useState } from "react";
import type { DetailsStatus } from "@/domain/eventStatus";
import { type Clock, formatDayTitle } from "@/domain/time";
import { EventSheet, initialEventSheet, newEventDraft } from "@/features/events";
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
];

const LUNCH = {
  title: "Lunch with Aunt Rosa",
  start: 720,
  end: 780,
  location: "Café Lumen",
  everyone: true,
  tagIds: [],
  notes: "",
};

const FOR_TWO = {
  everyone: false,
  tagIds: GALLERY_FAMILY.slice(1, 3).map((tag) => tag.id),
  notes: "Bring the birthday card",
};

const FOR_ONE = {
  everyone: false,
  tagIds: GALLERY_FAMILY.slice(0, 1).map((tag) => tag.id),
};

export function EventSheetGallery() {
  const [open, setOpen] = useState<Demo | null>(null);

  const close = () => setOpen(null);

  const draft = open?.mode === "new" ? newEventDraft(NOW, GALLERY_TZ) : LUNCH;

  const allDay = open?.allDay && { allDay: open.allDay };

  const tags = (open?.tags && FOR_TWO) || (open?.one && FOR_ONE);

  return (
    <GalleryGroup title={gallery.groups.eventSheet}>
      {DEMOS.map((demo) => (
        <Button key={demo.label} variant="secondary" onClick={() => setOpen(demo)}>
          {demo.label}
        </Button>
      ))}
      {open && (
        <EventSheet
          key={open.label}
          mode={open.mode}
          eyebrow={formatDayTitle(NOW, GALLERY_TZ)}
          initial={initialEventSheet(
            { ...draft, ...allDay, ...tags },
            open.time,
            open.discard,
            open.details,
          )}
          clock={open.clock ?? "12h"}
          tags={GALLERY_FAMILY}
          offline={open.offline ?? false}
          status={open.status}
          compact={open.compact}
          onClose={close}
          onDelete={close}
          onSave={() => {}}
        />
      )}
    </GalleryGroup>
  );
}
