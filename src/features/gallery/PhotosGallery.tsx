import * as stylex from "@stylexjs/stylex";
import { type ComponentProps, useState } from "react";
import type { Photo } from "@/domain/schemas";
import {
  draftFromPhoto,
  FullScreenPhoto,
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
  PORTRAIT_PHOTO,
  UPLOAD_SAMPLES,
} from "./samples";

type ViewProps = ComponentProps<typeof PhotosView>;

type Demo = { key: string; small?: boolean } & Partial<ViewProps>;

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
  { key: "background", backgroundId: GALLERY_PHOTOS[1]?.id },
  {
    key: "portrait",
    state: { kind: "ready", data: [PORTRAIT_PHOTO, ...GALLERY_PHOTOS] },
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
  { key: "small", small: true, breakpoint: "small", canUpload: false },
  { key: "small-empty", small: true, breakpoint: "small", canUpload: false, state: EMPTY },
];

const styles = stylex.create({
  view: {
    width: 1200,
    minHeight: 760,
  },
  small: {
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
  breakpoint: "large",
  backgroundId: undefined,
  photoSrc: galleryPhotoSrc,
  onSelect: ignore,
  onEdit: ignore,
  onStep: ignore,
  onTogglePlay: ignore,
  onFullScreen: ignore,
  onUpload: ignore,
  onRetry: ignore,
  onRemove: ignore,
  onSetBackground: ignore,
  onOpenBackground: ignore,
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

const fullWords = gallery.fullScreen;

export function PhotosGallery() {
  const [open, setOpen] = useState<SheetDemo | null>(null);

  return (
    <>
      <GalleryGroup title={gallery.groups.photosView}>
        {DEMOS.map(({ key, small, ...demo }) => (
          <div key={key} {...stylex.props(small ? styles.small : styles.view)}>
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
      <GalleryGroup title={gallery.groups.fullScreen}>
        <FullScreenDemo />
      </GalleryGroup>
    </>
  );
}

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

function FullScreenDemo() {
  const [chrome, setChrome] = useState<boolean | null>(null);

  const [index, setIndex] = useState(0);

  const [playing, setPlaying] = useState(true);

  const total = GALLERY_PHOTOS.length;

  const photo = GALLERY_PHOTOS[index];

  return (
    <>
      <Button variant="secondary" onClick={() => setChrome(true)}>
        {fullWords.shown}
      </Button>
      <Button variant="secondary" onClick={() => setChrome(false)}>
        {fullWords.hidden}
      </Button>
      {chrome !== null && photo && (
        <FullScreenPhoto
          photo={photo}
          src={galleryPhotoSrc(photo.id)}
          index={index}
          total={total}
          thisYear={2026}
          playing={playing}
          chrome={chrome}
          onExit={() => setChrome(null)}
          onToggleChrome={() => setChrome(!chrome)}
          onStep={(delta) => setIndex((index + delta + total) % total)}
          onTogglePlay={() => setPlaying(!playing)}
        />
      )}
    </>
  );
}
