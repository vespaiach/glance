import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { PhotosView } from "@/features/photos";
import { GalleryGroup } from "./GalleryGroup";
import { GALLERY_PHOTOS, GALLERY_TZ, gallery, galleryPhotoSrc, UPLOAD_SAMPLES } from "./samples";

type ViewProps = ComponentProps<typeof PhotosView>;

type Demo = { key: string; phone?: boolean } & Partial<ViewProps>;

const ignore = () => {};

const READY = { kind: "ready", data: GALLERY_PHOTOS } as const;

const EMPTY = { kind: "empty" } as const;

const DEMOS: readonly Demo[] = [
  { key: "ready" },
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
  selected: 1,
  playing: true,
  uploads: [],
  online: true,
  canUpload: true,
  breakpoint: "wide",
  photoSrc: galleryPhotoSrc,
  onSelect: ignore,
  onStep: ignore,
  onTogglePlay: ignore,
  onUpload: ignore,
  onRetry: ignore,
  onRemove: ignore,
};

export function PhotosGallery() {
  return (
    <GalleryGroup title={gallery.groups.photosView}>
      {DEMOS.map(({ key, phone, ...demo }) => (
        <div key={key} {...stylex.props(phone ? styles.phone : styles.view)}>
          <PhotosView {...base} {...demo} />
        </div>
      ))}
    </GalleryGroup>
  );
}
