import * as stylex from "@stylexjs/stylex";
import { ChevronLeft, Image } from "lucide-react";
import { copy } from "@/copy";
import type { PhotoVariant } from "@/data/repos";
import { pickPhoto, shownBackground } from "@/domain/background";
import type { Breakpoint } from "@/domain/breakpoint";
import type { AccountSettings, Photo } from "@/domain/schemas";
import type { ZoneState } from "@/domain/zoneState";
import type { UploadTile } from "@/features/photos";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { PillTabs } from "@/ui/PillTabs";
import { Skeleton, SkeletonBlock } from "@/ui/Skeleton";
import { SourceFailure } from "@/ui/SourceFailure";
import { Zone } from "@/ui/Zone";
import { backgroundLayout } from "../layout";
import { BackgroundOptions } from "./BackgroundOptions";
import { BackgroundThumbs } from "./BackgroundThumbs";

type Background = AccountSettings["background"];

type BackgroundViewProps = {
  state: ZoneState<Photo>;
  retryIn: number;
  onRetrySync: () => void;
  background: Background;
  now: Date;
  uploads: readonly UploadTile[];
  online: boolean;
  canUpload: boolean;
  breakpoint: Breakpoint;
  photoSrc: (photoId: string, variant: PhotoVariant) => string;
  onChange: (change: Partial<Background>) => void;
  onBack: () => void;
  onUpload: () => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
};

type PhotosProps = Omit<
  BackgroundViewProps,
  "state" | "retryIn" | "onRetrySync" | "onBack" | "breakpoint"
> & {
  photos: readonly Photo[];
  columns: stylex.StyleXStyles;
};

const SKELETON_THUMBS = [0, 1, 2, 3];

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: space.lg,
    alignItems: "start",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: space.lg,
    minWidth: 0,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    padding: "clamp(20px, 2.6vw, 40px)",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
    alignItems: "flex-start",
  },
  title: {
    margin: 0,
    fontSize: type.displayXlSize,
    fontWeight: type.displayXlWeight,
    letterSpacing: type.displayXlLs,
    lineHeight: type.displayXlLh,
  },
  modes: {
    maxWidth: "100%",
    overflowX: "auto",
    display: "flex",
  },
  tabs: {
    backgroundColor: colors.surfaceSoft,
  },
  photos: {
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
  },
  skeleton: {
    display: "grid",
    gap: space.md,
  },
});

function gridLabel(mode: Background["mode"], count: number): string {
  return mode === "slideshow" ? copy.background.inRotation(count) : copy.background.selectOne;
}

function ThumbsSkeleton({ columns }: { columns: stylex.StyleXStyles }) {
  return (
    <Skeleton label={copy.background.loading} xstyle={[styles.skeleton, columns]}>
      {SKELETON_THUMBS.map((thumb) => (
        <SkeletonBlock key={thumb} height={96} radius={radii.md} />
      ))}
    </Skeleton>
  );
}

function Photos({ photos, background, now, onChange, ...rest }: PhotosProps) {
  return (
    <div {...stylex.props(styles.photos)}>
      <Eyebrow>{gridLabel(background.mode, photos.length)}</Eyebrow>
      <BackgroundThumbs
        {...rest}
        photos={photos}
        shown={shownBackground(background, photos, now)}
        onPick={(photoId) => onChange(pickPhoto(background.mode, photoId))}
      />
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div {...stylex.props(styles.header)}>
      <Button variant="ghost" icon={ChevronLeft} onClick={onBack}>
        {copy.background.back}
      </Button>
      <h2 {...stylex.props(styles.title)}>{copy.background.title}</h2>
    </div>
  );
}

function readyPhotos(state: ZoneState<Photo>): readonly Photo[] {
  return state.kind === "ready" ? state.data : [];
}

export function BackgroundView({
  state,
  retryIn,
  onRetrySync,
  breakpoint,
  onBack,
  ...picker
}: BackgroundViewProps) {
  const layout = backgroundLayout(breakpoint);

  const { background, now, photoSrc, onChange } = picker;

  const shown = shownBackground(background, readyPhotos(state), now);

  const photos = { ...picker, columns: layout.thumbs };

  return (
    <div {...stylex.props(styles.grid, layout.grid)}>
      <div {...stylex.props(styles.panel)}>
        <Header onBack={onBack} />
        <div {...stylex.props(styles.modes)}>
          <PillTabs
            label={copy.background.title}
            options={copy.background.modes}
            value={background.mode}
            onChange={(mode) => onChange({ mode })}
            xstyle={styles.tabs}
          />
        </div>
        <Zone
          state={state}
          loading={<ThumbsSkeleton columns={layout.thumbs} />}
          empty={<Photos {...photos} photos={[]} />}
          failed={
            <SourceFailure
              icon={Image}
              title={copy.background.unavailable}
              body={copy.zone.failedBody(retryIn)}
              retryLabel={copy.zone.retry}
              onRetry={onRetrySync}
            />
          }
        >
          {(rows) => <Photos {...photos} photos={rows} />}
        </Zone>
      </div>
      <BackgroundOptions
        background={background}
        shown={shown}
        previewSrc={shown.mode === "season" ? undefined : photoSrc(shown.photo.id, "display")}
        onChange={onChange}
      />
    </div>
  );
}
