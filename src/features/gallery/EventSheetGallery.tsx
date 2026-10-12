import { useState } from "react";
import type { Season } from "@/domain/schemas";
import { type Clock, formatDayTitle } from "@/domain/time";
import { EventSheet, eventSwatches, initialEventSheet, newEventDraft } from "@/features/events";
import { Button } from "@/ui/Button";
import { GalleryGroup } from "./GalleryGroup";
import { gallery, NOW } from "./samples";

type Demo = {
  label: string;
  mode: "new" | "edit";
  time?: "start" | "end" | "error" | "noend";
  clock?: Clock;
  offline?: boolean;
  compact?: boolean;
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
];

const LUNCH = {
  title: "Lunch with Aunt Rosa",
  start: 720,
  end: 780,
  location: "Café Lumen",
  tone: 2,
} as const;

export function EventSheetGallery({ season }: { season: Season }) {
  const [open, setOpen] = useState<Demo | null>(null);

  const close = () => setOpen(null);

  const draft = open?.mode === "new" ? newEventDraft(NOW) : LUNCH;

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
          eyebrow={formatDayTitle(NOW)}
          initial={initialEventSheet(draft, open.time)}
          clock={open.clock ?? "12h"}
          swatches={eventSwatches(season)}
          offline={open.offline ?? false}
          compact={open.compact}
          onClose={close}
          onDelete={close}
          onSave={close}
        />
      )}
    </GalleryGroup>
  );
}
