import * as stylex from "@stylexjs/stylex";
import { Upload, WifiOff } from "lucide-react";
import { copy } from "@/copy";
import type { PhotoVariant } from "@/data/repos";
import { drawingSrc, type ShownBackground } from "@/domain/background";
import type { Photo, Season } from "@/domain/schemas";
import { PendingUpload, type UploadTile } from "@/features/photos";
import { colors, motion, radii, shadows, space } from "@/theme/tokens.stylex";
import { Icon } from "@/ui/Icon";

type BackgroundThumbsProps = {
  photos: readonly Photo[];
  shown: ShownBackground;
  uploads: readonly UploadTile[];
  online: boolean;
  canUpload: boolean;
  columns: stylex.StyleXStyles;
  photoSrc: (photoId: string, variant: PhotoVariant) => string;
  onPick: (photoId: string) => void;
  onUpload: () => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
};

type DrawingThumbsProps = {
  shown: ShownBackground;
  season: Season;
  columns: stylex.StyleXStyles;
  onPick: (drawing: Season) => void;
};

const DRAWINGS: readonly Season[] = ["spring", "summer", "fall", "winter"];

const styles = stylex.create({
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
  tile: {
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
    transitionProperty: "transform, opacity",
    transitionDuration: `${motion.durPress}, ${motion.durFast}`,
    transitionTimingFunction: motion.easeOut,
    transform: {
      default: null,
      ":active": "scale(0.97)",
    },
  },
  faded: {
    opacity: 0.5,
  },
  disabled: {
    cursor: "default",
    transform: "none",
  },
  frame: {
    aspectRatio: "16 / 9",
  },
  image: {
    width: "100%",
    aspectRatio: "16 / 9",
    objectFit: "cover",
    borderRadius: radii.md,
    display: "block",
  },
  ring: {
    boxShadow: `0 0 0 3px ${colors.white}, 0 0 0 5px ${colors.black}`,
  },
  title: {
    fontSize: 15,
    fontWeight: 330,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  },
  selectedTitle: {
    fontWeight: 540,
  },
  uploadFrame: {
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: radii.md,
    boxShadow: shadows.shadow1,
    display: "grid",
    placeItems: "center",
  },
  uploadLabel: {
    fontSize: 15,
    fontWeight: 330,
  },
});

type ThumbProps = {
  label: string;
  title: string;
  src: string;
  selected: boolean;
  faded: boolean;
  onPick: () => void;
};

export function BackgroundThumbs({
  photos,
  shown,
  uploads,
  online,
  canUpload,
  columns,
  photoSrc,
  onPick,
  onUpload,
  onRetry,
  onRemove,
}: BackgroundThumbsProps) {
  const selected = selectedId(shown);

  return (
    <ul aria-label={copy.background.list} {...stylex.props(styles.grid, columns)}>
      {uploads.map((tile) => (
        <li key={tile.id} {...stylex.props(styles.item)}>
          <PendingUpload tile={tile} onRetry={onRetry} onRemove={onRemove} frame={styles.frame} />
        </li>
      ))}
      {photos.map((photo) => (
        <li key={photo.id} {...stylex.props(styles.item)}>
          <Thumb
            label={copy.background.use(photo.title)}
            title={photo.title}
            src={photoSrc(photo.id, "thumb")}
            selected={photo.id === selected}
            faded={!("photo" in shown)}
            onPick={() => onPick(photo.id)}
          />
        </li>
      ))}
      {canUpload && (
        <li {...stylex.props(styles.item)}>
          <UploadPhoto online={online} onUpload={onUpload} />
        </li>
      )}
    </ul>
  );
}

export function DrawingThumbs({ shown, season, columns, onPick }: DrawingThumbsProps) {
  const text = copy.background;

  return (
    <ul aria-label={text.drawings} {...stylex.props(styles.grid, columns)}>
      {DRAWINGS.map((drawing) => (
        <li key={drawing} {...stylex.props(styles.item)}>
          <Thumb
            label={text.pickDrawing(copy.season[drawing])}
            title={drawingTitle(drawing, season)}
            src={drawingSrc(drawing)}
            selected={shown.mode === "season" && shown.drawing === drawing}
            faded={shown.mode !== "season"}
            onPick={() => onPick(drawing)}
          />
        </li>
      ))}
    </ul>
  );
}

function Thumb({ label, title, src, selected, faded, onPick }: ThumbProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onPick}
      {...stylex.props(styles.tile, faded && styles.faded)}
    >
      {/* biome-ignore lint/performance/noImgElement: photos come pre-sized from the authenticated file route and the service worker cache, not the Next image optimizer */}
      <img src={src} alt="" {...stylex.props(styles.image, selected && styles.ring)} />
      <span {...stylex.props(styles.title, selected && styles.selectedTitle)}>{title}</span>
    </button>
  );
}

function UploadPhoto({ online, onUpload }: { online: boolean; onUpload: () => void }) {
  return (
    <button
      type="button"
      disabled={!online}
      onClick={onUpload}
      {...stylex.props(styles.tile, !online && styles.disabled)}
    >
      <span {...stylex.props(styles.uploadFrame)}>
        <Icon icon={online ? Upload : WifiOff} size={24} />
      </span>
      <span {...stylex.props(styles.uploadLabel)}>
        {online ? copy.background.upload : copy.background.uploadOffline}
      </span>
    </button>
  );
}

function drawingTitle(drawing: Season, season: Season): string {
  const name = copy.season[drawing];

  return drawing === season ? copy.background.drawingNow(name) : name;
}

function selectedId(shown: ShownBackground): string | undefined {
  return "photo" in shown ? shown.photo.id : undefined;
}
