"use client";

import { useRef, useState } from "react";
import type { Tag } from "@/domain/schemas";
import {
  type FilterLabels,
  filterLabel,
  type TagFilter,
  toggleEveryone,
  toggleFilter,
} from "@/domain/tags";
import { WhoSheet, type WhoSheetLabels } from "./WhoSheet";
import { WhoStack, type WhoStackSize } from "./WhoStack";

export type WhoFilterLabels = FilterLabels &
  Omit<WhoSheetLabels, "members"> & {
    members: (count: number) => string;
    change: (label: string) => string;
    more: (count: number) => string;
  };

type WhoFilterProps = {
  tags: readonly Tag[];
  selected: ReadonlySet<string>;
  size: WhoStackSize;
  max: number;
  labels: WhoFilterLabels;
  defaultOpen?: boolean;
  onChange: (filter: TagFilter) => void;
};

export function WhoFilter({
  tags,
  selected,
  size,
  max,
  labels,
  defaultOpen = false,
  onChange,
}: WhoFilterProps) {
  const [open, setOpen] = useState(defaultOpen);

  const stack = useRef<HTMLButtonElement>(null);

  const allIds = tags.map((tag) => tag.id);

  const label = filterLabel(selected, tags, labels);

  const close = () => {
    setOpen(false);
    stack.current?.focus();
  };

  return (
    <>
      <WhoStack
        ref={stack}
        shown={tags.filter((tag) => selected.has(tag.id))}
        max={max}
        size={size}
        label={label}
        name={labels.change(label)}
        more={labels.more}
        onOpen={() => setOpen(true)}
      />
      {open && (
        <WhoSheet
          tags={tags}
          selected={selected}
          labels={{ ...labels, members: labels.members(tags.length) }}
          onToggle={(id) => onChange(toggleFilter(selected, id, allIds))}
          onEveryone={() => onChange(toggleEveryone(selected, allIds))}
          onClose={close}
        />
      )}
    </>
  );
}
