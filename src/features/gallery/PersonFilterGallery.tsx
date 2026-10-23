import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { copy } from "@/copy";
import { liveFilter, type TagFilter } from "@/domain/tags";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { WhoFilter } from "@/ui/WhoFilter";
import type { WhoStackSize } from "@/ui/WhoStack";
import { GalleryGroup } from "./GalleryGroup";
import { gallery } from "./samples";
import { TIMELINE_FAMILY } from "./timelineSamples";

type Demo = {
  label: string;
  size: WhoStackSize;
  max: number;
  start: TagFilter;
};

const styles = stylex.create({
  tile: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
    padding: space.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
    boxShadow: `inset 0 0 0 1px ${colors.borderHairline}`,
  },
});

const ids = (...indexes: number[]) =>
  new Set(indexes.map((index) => TIMELINE_FAMILY[index]?.id ?? ""));

const words = gallery.personFilter;

const DEMOS: readonly Demo[] = [
  { label: words.everyone, size: "large", max: 8, start: "all" },
  { label: words.two, size: "large", max: 8, start: ids(2, 3) },
  { label: words.some, size: "large", max: 8, start: ids(0, 1, 5) },
  { label: words.nobody, size: "large", max: 8, start: new Set() },
  { label: words.small, size: "small", max: 4, start: "all" },
  { label: words.smallFew, size: "small", max: 4, start: ids(0, 1, 2, 3) },
  { label: words.today, size: "today", max: 5, start: "all" },
  { label: words.todayNarrow, size: "today", max: 3, start: "all" },
  { label: words.todayFew, size: "today", max: 5, start: ids(0, 2, 4) },
];

export function PersonFilterGallery() {
  return (
    <GalleryGroup title={gallery.groups.personFilter}>
      {DEMOS.map((demo) => (
        <FilterDemo key={demo.label} demo={demo} />
      ))}
    </GalleryGroup>
  );
}

function FilterDemo({ demo }: { demo: Demo }) {
  const [filter, setFilter] = useState(demo.start);

  const allIds = TIMELINE_FAMILY.map((tag) => tag.id);

  return (
    <div {...stylex.props(styles.tile)}>
      <Eyebrow size="caption">{demo.label}</Eyebrow>
      <WhoFilter
        tags={TIMELINE_FAMILY}
        selected={liveFilter(filter, allIds)}
        size={demo.size}
        max={demo.max}
        labels={copy.personFilter}
        onChange={setFilter}
      />
    </div>
  );
}
