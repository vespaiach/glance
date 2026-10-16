import * as stylex from "@stylexjs/stylex";
import { type ComponentProps, useState } from "react";
import type { Photo } from "@/domain/schemas";
import {
  draftFromPhoto,
  initialPhotoSheet,
  PhotoSheet,
  type PhotoSheetState,
  PhotosView,
} from "@/features/photos";
import { Button } from "@/ui/Button";
import { GalleryGroup } from "./GalleryGroup";
import {
  GALLERY_PHOTOS,
  GALLERY_TZ,
  GUESSED_PHOTOS,
  gallery,
  galleryPhotoSrc,
  UPLOAD_SAMPLES,
} from "./samples";

type ViewProps = ComponentProps<typeof PhotosView>;

type Demo = { key: string; phone?: boolean } & Partial<ViewProps>;

const ignore = () => {};

const READY = { kind: "ready", data: GALLERY_PHOTOS } as const;

const EMPTY = { kind: "empty" } as const;

const [HALLOWEEN, BEACH] = GUESSED_PHOTOS as [Photo, Photo];

const DEMOS: readonly Demo[] = [
  { key: "ready" },
  {
    key: "guessed",
    state: { kind: "ready", data: [...GUESSED_PHOTOS, ...GALLERY_PHOTOS] },
    selected: 0,
  },
  { key: "one", uploads: UPLOAD_SAMPLES.one },
  { key: "several", uploads: UPLOAD_SAMPLES.several },
  { key: "failed", uploads: UPLOAD_SAMPLES.failed },
  { key: "paused", uploads: UPLOAD_SAMPLES.paused, online: false },
  { key: "first", state: EMPTY, uploads: UPLOAD_SAMPLES.one },
  { key: "empty", state: EMPTY },
  { key: "empty-offline", state: EMPTY, online: false },
  { key: "loading", state: { kind: "loading" } },
  { key: "failed-zone", state: { kind: "failed" } },
  { key: "phone", phone: true, breakpoint: "phone", canUpload: false },
  { key: "phone-empty", phone: true, breakpoint: "phone", canUpload: false, state: EMPTY },
];

const styles = stylex.create({
  view: {
    width: 1200,
    minHeight: 760,
  },
  phone: {
    width: 350,
  },
});

const base: ViewProps = {
  state: READY,
  retryIn: 1,
  onRetrySync: ignore,
  clock: "12h",
  tz: GALLERY_TZ,
  thisYear: 2026,
  selected: 1,
  playing: true,
  uploads: [],
  online: true,
  canUpload: true,
  breakpoint: "wide",
  photoSrc: galleryPhotoSrc,
  onSelect: ignore,
  onEdit: ignore,
  onStep: ignore,
  onTogglePlay: ignore,
  onUpload: ignore,
  onRetry: ignore,
  onRemove: ignore,
};

type SheetDemo = { label: string; photo: Photo; initial: PhotoSheetState; offline?: boolean };

const sheetWords = gallery.photoSheet;

const SHEET_DEMOS: readonly SheetDemo[] = [
  {
    label: sheetWords.fileName,
    photo: HALLOWEEN,
    initial: initialPhotoSheet(draftFromPhoto(HALLOWEEN)),
  },
  { label: sheetWords.fromPhoto, photo: BEACH, initial: initialPhotoSheet(draftFromPhoto(BEACH)) },
  {
    label: sheetWords.noName,
    photo: BEACH,
    initial: {
      ...initialPhotoSheet(draftFromPhoto(BEACH)),
      draft: { title: "", takenOn: "", place: "Cannon Beach, OR" },
      error: "name",
    },
  },
  {
    label: sheetWords.offline,
    photo: HALLOWEEN,
    initial: initialPhotoSheet(draftFromPhoto(HALLOWEEN)),
    offline: true,
  },
  {
    label: sheetWords.discard,
    photo: HALLOWEEN,
    initial: initialPhotoSheet(draftFromPhoto(HALLOWEEN), { discard: true }),
  },
];

function PhotoSheetDemo({ demo, onClose }: { demo: SheetDemo; onClose: () => void }) {
  return (
    <PhotoSheet
      photo={demo.photo}
      src={galleryPhotoSrc(demo.photo.id)}
      today="2026-10-09"
      initial={demo.initial}
      offline={demo.offline ?? false}
      onClose={onClose}
      onDelete={onClose}
      onSave={onClose}
    />
  );
}

export function PhotosGallery() {
  const [open, setOpen] = useState<SheetDemo | null>(null);

  return (
    <>
      <GalleryGroup title={gallery.groups.photosView}>
        {DEMOS.map(({ key, phone, ...demo }) => (
          <div key={key} {...stylex.props(phone ? styles.phone : styles.view)}>
            <PhotosView {...base} {...demo} />
          </div>
        ))}
      </GalleryGroup>
      <GalleryGroup title={gallery.groups.photoSheet}>
        {SHEET_DEMOS.map((demo) => (
          <Button key={demo.label} variant="secondary" onClick={() => setOpen(demo)}>
            {demo.label}
          </Button>
        ))}
        {open && <PhotoSheetDemo key={open.label} demo={open} onClose={() => setOpen(null)} />}
      </GalleryGroup>
    </>
  );
}
