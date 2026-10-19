import { useState } from "react";
import { copy } from "@/copy";
import { MemberColorSchema } from "@/domain/schemas";
import { type FamilyRow, FamilySheet, initialFamilySheet } from "@/features/family";
import { Button } from "@/ui/Button";
import { GalleryGroup } from "./GalleryGroup";
import { GALLERY_FAMILY, gallery } from "./samples";

type Demo = {
  label: string;
  rows: readonly FamilyRow[];
  removing?: string;
  name?: string;
  error?: boolean;
  discard?: boolean;
};

const words = gallery.familySheet;

const PLANS: readonly (readonly [number, number])[] = [
  [3, 11],
  [2, 12],
  [1, 0],
  [0, 4],
  [0, 0],
];

const ROWS: readonly FamilyRow[] = GALLERY_FAMILY.map((member, index) => {
  const [solo, shared] = PLANS[index] ?? [0, 0];

  return { member, solo, shared };
});

const FULL: readonly FamilyRow[] = MemberColorSchema.options.map((color, index) => ({
  member: { id: `full-${index}`, name: copy.family.colors[color], color, createdAt: "" },
  solo: 0,
  shared: 0,
}));

const DEMOS: readonly Demo[] = [
  { label: words.list, rows: ROWS },
  { label: words.remove, rows: ROWS, removing: ROWS[1]?.member.id },
  { label: words.removeNoPlans, rows: ROWS, removing: ROWS[4]?.member.id },
  { label: words.empty, rows: ROWS, error: true },
  { label: words.taken, rows: ROWS, name: words.takenName, error: true },
  { label: words.discard, rows: ROWS, name: words.typedName, discard: true },
  { label: words.one, rows: ROWS.slice(0, 1) },
  { label: words.full, rows: FULL },
];

export function FamilyGallery() {
  const [open, setOpen] = useState<Demo | null>(null);

  return (
    <GalleryGroup title={gallery.groups.familySheet}>
      {DEMOS.map((demo) => (
        <Button key={demo.label} variant="secondary" onClick={() => setOpen(demo)}>
          {demo.label}
        </Button>
      ))}
      {open && (
        <FamilySheet
          key={open.label}
          rows={open.rows}
          initial={initialFamilySheet(open)}
          onAdd={() => {}}
          onRemove={() => setOpen(null)}
          onClose={() => setOpen(null)}
        />
      )}
    </GalleryGroup>
  );
}
