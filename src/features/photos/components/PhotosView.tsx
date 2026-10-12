import * as stylex from "@stylexjs/stylex";
import { Image } from "lucide-react";
import { copy } from "@/copy";
import type { PhotoVariant } from "@/data/repos";
import type { Breakpoint } from "@/domain/breakpoint";
import type { Photo } from "@/domain/schemas";
import { type Clock, formatClock, minutesOfDay } from "@/domain/time";
import type { ZoneState } from "@/domain/zoneState";
import { radii, space } from "@/theme/tokens.stylex";
import { ColorBlock } from "@/ui/ColorBlock";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { SourceFailure } from "@/ui/SourceFailure";
import { Zone } from "@/ui/Zone";
import { photosLayout } from "../layout";
import { type UploadTile, uploadSummary } from "../uploads";
import { FeaturedPhoto, FeaturedWaiting } from "./FeaturedPhoto";
import { PhotoPanel } from "./PhotoPanel";
import { PhotosEmpty } from "./PhotosEmpty";

type PhotosViewProps = {
  state: ZoneState<Photo>;
  retryIn: number;
  onRetrySync: () => void;
  clock: Clock;
  selected: number;
  playing: boolean;
  uploads: readonly UploadTile[];
  online: boolean;
  canUpload: boolean;
  breakpoint: Breakpoint;
  photoSrc: (photoId: string, variant: PhotoVariant) => string;
  onSelect: (index: number) => void;
  onStep: (delta: number) => void;
  onTogglePlay: () => void;
  onUpload: () => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
};

type GalleryProps = Omit<PhotosViewProps, "state" | "retryIn" | "onRetrySync"> & {
  photos: readonly Photo[];
  updatedAt?: string;
};

const SKELETON_THUMBS = [0, 1, 2, 3];

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: space.lg,
  },
  featured: {
    display: "flex",
    flexDirection: "column",
    gap: space.lg,
    minWidth: 0,
  },
  skeletonThumbs: {
    display: "grid",
    gap: space.md,
    alignContent: "start",
  },
});

function PhotosSkeleton({ breakpoint }: { breakpoint: Breakpoint }) {
  const layout = photosLayout(breakpoint);

  return (
    <Skeleton label={copy.photos.loading} xstyle={[styles.grid, layout.grid]}>
      <SkeletonBlock height="100%" radius={radii.lg} xstyle={layout.featured} />
      <div {...stylex.props(styles.skeletonThumbs, layout.thumbs)}>
        {SKELETON_THUMBS.map((thumb) => (
          <SkeletonBlock key={thumb} height={160} radius={radii.md} />
        ))}
      </div>
    </Skeleton>
  );
}

function PhotoGallery({
  photos,
  selected,
  breakpoint,
  photoSrc,
  updatedAt,
  ...rest
}: GalleryProps) {
  const layout = photosLayout(breakpoint);

  const featured = photos[selected];

  return (
    <div {...stylex.props(styles.grid, layout.grid)}>
      <ColorBlock tone="soft" padding="24px" xstyle={styles.featured}>
        {featured ? (
          <FeaturedPhoto
            photo={featured}
            src={photoSrc(featured.id, "display")}
            playing={rest.playing}
            onStep={rest.onStep}
            onTogglePlay={rest.onTogglePlay}
            frame={layout.featured}
          />
        ) : (
          <FeaturedWaiting frame={layout.featured} />
        )}
      </ColorBlock>
      <PhotoPanel
        photos={photos}
        {...(updatedAt !== undefined && {
          updated: formatClock(minutesOfDay(new Date(updatedAt)), rest.clock),
        })}
        selected={selected}
        uploads={rest.uploads}
        summary={uploadSummary(rest.uploads, rest.online)}
        online={rest.online}
        canUpload={rest.canUpload}
        columns={layout.thumbs}
        photoSrc={photoSrc}
        onSelect={rest.onSelect}
        onUpload={rest.onUpload}
        onRetry={rest.onRetry}
        onRemove={rest.onRemove}
      />
    </div>
  );
}

export function PhotosView({ state, retryIn, onRetrySync, ...gallery }: PhotosViewProps) {
  return (
    <Zone
      state={state}
      loading={<PhotosSkeleton breakpoint={gallery.breakpoint} />}
      empty={
        gallery.uploads.length > 0 ? (
          <PhotoGallery {...gallery} photos={[]} />
        ) : (
          <PhotosEmpty
            online={gallery.online}
            canUpload={gallery.canUpload}
            onUpload={gallery.onUpload}
          />
        )
      }
      failed={
        <SourceFailure
          icon={Image}
          title={copy.photos.unavailable}
          body={copy.zone.failedBody(retryIn)}
          retryLabel={copy.zone.retry}
          onRetry={onRetrySync}
        />
      }
    >
      {(photos, updatedAt) => (
        <PhotoGallery
          {...gallery}
          photos={photos}
          {...(updatedAt !== undefined && { updatedAt })}
        />
      )}
    </Zone>
  );
}
