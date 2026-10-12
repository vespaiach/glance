import * as stylex from "@stylexjs/stylex";
import { CloudOff, FileWarning, FileX, type LucideIcon, RotateCw, X } from "lucide-react";
import { copy } from "@/copy";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "@/ui/Icon";
import { IconButton } from "@/ui/IconButton";
import type { UploadFailure, UploadTile } from "../uploads";

type PendingUploadProps = {
  tile: UploadTile;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  frame?: stylex.StyleXStyles;
};

const FAILURE_ICONS: Record<UploadFailure, LucideIcon> = {
  "too-large": FileWarning,
  "not-a-photo": FileX,
  network: CloudOff,
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
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    padding: space.sm,
    boxSizing: "border-box",
    textAlign: "center",
  },
  reason: {
    fontSize: 15,
    fontWeight: 540,
    lineHeight: 1.3,
    textWrap: "pretty",
  },
  caption: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.xs,
    width: "100%",
    minHeight: 20,
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
    gap: space.xxs,
    flexShrink: 0,
  },
  action: {
    width: 44,
    height: 44,
  },
});

function statusText(tile: Exclude<UploadTile, { state: "failed" }>): string {
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

function Failure({ reason }: { reason: UploadFailure }) {
  return (
    <div role="alert" {...stylex.props(styles.failure)}>
      <Icon icon={FAILURE_ICONS[reason]} size={28} strokeWidth={1.5} />
      <span {...stylex.props(styles.reason)}>{copy.photos.tile.failed[reason]}</span>
    </div>
  );
}

function FailedActions({ tile, onRetry, onRemove }: PendingUploadProps) {
  return (
    <div {...stylex.props(styles.actions)}>
      {tile.state === "failed" && tile.reason === "network" && (
        <IconButton
          icon={RotateCw}
          label={copy.photos.tile.retry}
          onClick={() => onRetry(tile.id)}
          xstyle={styles.action}
        />
      )}
      <IconButton
        icon={X}
        label={copy.photos.tile.remove}
        onClick={() => onRemove(tile.id)}
        xstyle={styles.action}
      />
    </div>
  );
}

export function PendingUpload({ tile, onRetry, onRemove, frame }: PendingUploadProps) {
  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.frame, frame)}>
        {tile.state !== "failed" && tile.preview && (
          // biome-ignore lint/performance/noImgElement: the preview is a local object URL of the chosen file, which the Next image optimizer can't load
          <img src={tile.preview} alt="" {...stylex.props(styles.preview)} />
        )}
        {tile.state === "failed" ? (
          <Failure reason={tile.reason} />
        ) : (
          <Progress title={tile.title} percent={tile.percent} />
        )}
      </div>
      <div {...stylex.props(styles.caption)}>
        <span {...stylex.props(styles.title)}>{tile.title}</span>
        {tile.state === "failed" ? (
          <FailedActions tile={tile} onRetry={onRetry} onRemove={onRemove} />
        ) : (
          <span {...stylex.props(styles.status)}>{statusText(tile)}</span>
        )}
      </div>
    </div>
  );
}
