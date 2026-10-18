import * as stylex from "@stylexjs/stylex";
import { Upload } from "lucide-react";
import { copy } from "@/copy";
import type { PhotoVariant } from "@/data/repos";
import type { Photo } from "@/domain/schemas";
import { colors, motion, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { photoDate } from "../slideshow";
import type { UploadSummary, UploadTile } from "../uploads";
import { PendingUpload } from "./PendingUpload";
import { UploadRow } from "./UploadRow";

type PhotoPanelProps = {
  photos: readonly Photo[];
  thisYear: number;
  updated?: string;
  selected: number;
  uploads: readonly UploadTile[];
  summary: UploadSummary;
  online: boolean;
  canUpload: boolean;
  columns: stylex.StyleXStyles;
  photoSrc: (photoId: string, variant: PhotoVariant) => string;
  onSelect: (index: number) => void;
  onUpload: () => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
    minWidth: 0,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    paddingTop: space.xs,
    paddingInline: space.md,
    paddingBottom: space.md,
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.xs,
    minHeight: 44,
    paddingLeft: space.xxs,
  },
  grid: {
    display: "grid",
    gap: space.md,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  item: {
    minWidth: 0,
  },
  thumb: {
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
    fontFamily: "inherit",
    color: "inherit",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
    width: "100%",
    minWidth: 0,
    transitionProperty: "transform",
    transitionDuration: motion.durPress,
    transitionTimingFunction: motion.easeOut,
    transform: {
      default: null,
      ":active": "scale(0.97)",
    },
  },
  image: {
    width: "100%",
    aspectRatio: "4 / 3",
    objectFit: "cover",
    borderRadius: radii.md,
    display: "block",
  },
  ring: {
    boxShadow: `0 0 0 3px ${colors.white}, 0 0 0 5px ${colors.black}`,
  },
  caption: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.xs,
    width: "100%",
  },
  title: {
    fontSize: 15,
    fontWeight: 540,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  date: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
});

type ThumbProps = {
  photo: Photo;
  thisYear: number;
  src: string;
  selected: boolean;
  onSelect: () => void;
};

export function PhotoPanel({
  photos,
  thisYear,
  selected,
  uploads,
  summary,
  online,
  canUpload,
  columns,
  photoSrc,
  onSelect,
  onUpload,
  onRetry,
  onRemove,
  updated,
}: PhotoPanelProps) {
  const row = showsRow(summary, canUpload);

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.header)}>
        <Eyebrow>
          {updated === undefined
            ? copy.photos.count(photos.length)
            : copy.zone.updated(copy.photos.count(photos.length), updated)}
        </Eyebrow>
        {canUpload && (
          <Button variant="ghost" icon={Upload} disabled={!online} onClick={onUpload}>
            {copy.photos.upload}
          </Button>
        )}
      </div>
      {row && <UploadRow summary={row} />}
      <ul aria-label={copy.photos.list} {...stylex.props(styles.grid, columns)}>
        {uploads.map((tile) => (
          <li key={tile.id} {...stylex.props(styles.item)}>
            <PendingUpload tile={tile} onRetry={onRetry} onRemove={onRemove} />
          </li>
        ))}
        {photos.map((photo, index) => (
          <li key={photo.id} {...stylex.props(styles.item)}>
            <Thumb
              photo={photo}
              thisYear={thisYear}
              src={photoSrc(photo.id, "thumb")}
              selected={index === selected}
              onSelect={() => onSelect(index)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Thumb({ photo, thisYear, src, selected, onSelect }: ThumbProps) {
  return (
    <button
      type="button"
      aria-label={copy.photos.show(photo.title)}
      aria-pressed={selected}
      onClick={onSelect}
      {...stylex.props(styles.thumb)}
    >
      {/* biome-ignore lint/performance/noImgElement: photos come pre-sized from the authenticated file route and the service worker cache, not the Next image optimizer */}
      <img src={src} alt="" {...stylex.props(styles.image, selected && styles.ring)} />
      <span {...stylex.props(styles.caption)}>
        <span {...stylex.props(styles.title)}>{photo.title}</span>
        <span {...stylex.props(styles.date)}>{photoDate(photo, thisYear)}</span>
      </span>
    </button>
  );
}

function showsRow(summary: UploadSummary, canUpload: boolean) {
  if (summary.kind === "none") return undefined;

  return canUpload || summary.kind !== "offline" || summary.paused > 0 ? summary : undefined;
}
