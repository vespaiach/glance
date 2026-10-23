import * as stylex from "@stylexjs/stylex";
import { RotateCw, X } from "lucide-react";
import { copy } from "@/copy";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { IconButton } from "@/ui/IconButton";
import type { UploadTile } from "../uploads";

type FailureProps = {
  tile: Extract<UploadTile, { state: "failed" }>;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
};

type PendingUploadProps = {
  tile: UploadTile;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  frame?: stylex.StyleXStyles;
};

const MIN_BAR_PERCENT = 2;

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
    minWidth: 0,
  },
  frame: {
    position: "relative",
    width: "100%",
    aspectRatio: "4 / 3",
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceSoft,
  },
  preview: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    opacity: 0.6,
  },
  failedPreview: {
    opacity: 0.4,
  },
  track: {
    position: "absolute",
    left: space.sm,
    right: space.sm,
    bottom: space.sm,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceCanvas,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radii.full,
    backgroundColor: colors.actionPrimary,
    transitionProperty: "width",
    transitionDuration: "300ms",
    transitionTimingFunction: "linear",
  },
  fillWidth: (percent: number) => ({ width: `${Math.max(percent, MIN_BAR_PERCENT)}%` }),
  failure: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: space.xs,
    padding: space.xs,
    boxSizing: "border-box",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    maxWidth: "100%",
    boxSizing: "border-box",
    paddingBlock: 6,
    paddingInline: 10,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceCanvas,
    fontSize: 14,
    fontWeight: 540,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  },
  caption: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    width: "100%",
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: 540,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },
  status: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  actions: {
    display: "flex",
    gap: space.xs,
    alignSelf: "flex-end",
  },
});

export function PendingUpload({ tile, onRetry, onRemove, frame }: PendingUploadProps) {
  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.frame, frame)}>
        {tile.preview && (
          // biome-ignore lint/performance/noImgElement: the preview is a local object URL of the chosen file, which the Next image optimizer can't load
          <img
            src={tile.preview}
            alt=""
            {...stylex.props(styles.preview, tile.state === "failed" && styles.failedPreview)}
          />
        )}
        {tile.state === "failed" ? (
          <Failure tile={tile} onRetry={onRetry} onRemove={onRemove} />
        ) : (
          <Progress title={tile.title} percent={tile.percent} />
        )}
      </div>
      <div {...stylex.props(styles.caption)}>
        <span {...stylex.props(styles.title)}>{tile.title}</span>
        <span {...stylex.props(styles.status)}>{statusText(tile)}</span>
      </div>
    </div>
  );
}

function statusText(tile: UploadTile): string {
  if (tile.state === "failed") return copy.photos.tile.notUploaded;

  if (tile.state === "paused") return copy.photos.tile.paused;

  return tile.percent === 0 ? copy.photos.tile.waiting : copy.photos.tile.percent(tile.percent);
}

function Progress({ title, percent }: { title: string; percent: number }) {
  return (
    <div
      role="progressbar"
      aria-label={copy.photos.tile.uploading(title)}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      {...stylex.props(styles.track)}
    >
      <div {...stylex.props(styles.fill, styles.fillWidth(percent))} />
    </div>
  );
}

function Failure({ tile, onRetry, onRemove }: FailureProps) {
  const { tile: words } = copy.photos;

  return (
    <div
      role="alert"
      aria-label={words.failedName(tile.title, words.failed[tile.reason])}
      {...stylex.props(styles.failure)}
    >
      <span {...stylex.props(styles.pill)}>{words.short[tile.reason]}</span>
      <div {...stylex.props(styles.actions)}>
        {tile.reason === "network" && (
          <IconButton
            icon={RotateCw}
            label={words.retry}
            variant="canvas"
            size="touch"
            onClick={() => onRetry(tile.id)}
          />
        )}
        <IconButton
          icon={X}
          label={words.remove}
          variant="canvas"
          size="touch"
          onClick={() => onRemove(tile.id)}
        />
      </div>
    </div>
  );
}
