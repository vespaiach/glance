"use client";

import { useEffect, useReducer, useState } from "react";
import {
  ImportPage,
  type ImportPageAction,
  type ImportPageState,
  importPageReducer,
  type LastImport,
} from "@/features/import";
import { useBreakpoint } from "@/shell/breakpoint";
import { Button } from "@/ui/Button";
import { GalleryGroup } from "./GalleryGroup";
import { GALLERY_FAMILY, gallery, IMPORT_PHONE_LINK, IMPORT_REVIEW } from "./samples";

type Demo = {
  label: string;
  start: Exclude<ImportPageState, { step: "closed" }>;
  last?: LastImport;
  offline?: true;
};

const words = gallery.importPage;

const IMPORTING_MS = 1200;

const REVIEWING = { review: IMPORT_REVIEW, who: "everyone" } as const;

const MATCHED = 5;

const DONE = {
  count: 16,
  who: GALLERY_FAMILY[0]?.id ?? "everyone",
  range: IMPORT_REVIEW.range,
  duplicates: 2,
  matched: 0,
};

const LAST: LastImport = { date: "Oct 29", count: 16, who: "everyone", canUndo: true };

const DEMOS: readonly Demo[] = [
  { label: words.source, start: { step: "source" } },
  { label: words.sourceLast, start: { step: "source" }, last: LAST },
  { label: words.phone, start: { step: "phone" } },
  { label: words.review, start: { step: "review", ...REVIEWING } },
  {
    label: words.reviewMatched,
    start: { step: "review", review: { ...IMPORT_REVIEW, matched: MATCHED }, who: "everyone" },
  },
  { label: words.importing, start: { step: "importing", ...REVIEWING } },
  { label: words.done, start: { step: "done", done: DONE } },
  { label: words.doneMatched, start: { step: "done", done: { ...DONE, matched: MATCHED } } },
  { label: words.type, start: { step: "error", error: "type" } },
  { label: words.empty, start: { step: "error", error: "empty" } },
  { label: words.offline, start: { step: "error", error: "offline", ...REVIEWING }, offline: true },
];

export function ImportGallery() {
  const [open, setOpen] = useState<Demo | null>(null);

  return (
    <GalleryGroup title={gallery.groups.importPage}>
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
  const [state, dispatch] = useReducer(importPageReducer, demo.start);

  const [shown, setShown] = useState(demo.start);

  const [last, setLast] = useState(demo.last);

  const breakpoint = useBreakpoint();

  useFinishImport(state.step === "importing", demo.offline === true, dispatch);

  if (state.step !== "closed" && state !== shown) setShown(state);

  const close = () => dispatch({ type: "back" });

  return (
    <ImportPage
      breakpoint={breakpoint}
      state={shown}
      leaving={state.step === "closed"}
      tags={GALLERY_FAMILY}
      last={last}
      phone={{ link: IMPORT_PHONE_LINK, endsIn: "9:42" }}
      dispatch={dispatch}
      onFile={(file) =>
        dispatch(
          /\.ics$/i.test(file.name)
            ? { type: "reviewed", review: { ...IMPORT_REVIEW, fileName: file.name } }
            : { type: "failed", error: "type" },
        )
      }
      onImport={() => dispatch({ type: "importing" })}
      onUndo={close}
      onUndoLast={() => setLast(undefined)}
      onOpenCalendar={close}
      onNewCode={() => {}}
      onLeft={onLeft}
    />
  );
}

function useFinishImport(
  importing: boolean,
  offline: boolean,
  dispatch: (action: ImportPageAction) => void,
) {
  useEffect(() => {
    if (!importing) return;

    const timer = setTimeout(
      () =>
        dispatch(
          offline
            ? { type: "offline" }
            : { type: "imported", count: 16, range: IMPORT_REVIEW.range, matched: 0 },
        ),
      IMPORTING_MS,
    );

    return () => clearTimeout(timer);
  }, [importing, offline, dispatch]);
}
