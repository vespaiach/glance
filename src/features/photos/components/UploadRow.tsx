import * as stylex from "@stylexjs/stylex";
import { AlertCircle, type LucideIcon, RotateCw, Upload, WifiOff } from "lucide-react";
import { copy } from "@/copy";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import type { UploadSummary } from "../uploads";

type ShownSummary = Exclude<UploadSummary, { kind: "none" }>;

type UploadRowProps = {
  summary: ShownSummary;
  onRetryAll: () => void;
  onClear: () => void;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: space.sm,
    rowGap: space.xxs,
    minHeight: 48,
    paddingBlock: 10,
    paddingInline: "16px 20px",
    boxSizing: "border-box",
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
  },
  offline: {
    borderRadius: radii.full,
    backgroundColor: colors.surfaceInverse,
    color: colors.textInverse,
  },
  text: {
    flexGrow: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: 330,
    lineHeight: 1.4,
    textWrap: "pretty",
  },
  offlineText: {
    fontWeight: 480,
  },
  actions: {
    display: "flex",
    gap: space.xxs,
    marginBlock: -6,
    marginLeft: "auto",
    marginRight: -12,
  },
  meta: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
});

const ICONS: Record<ShownSummary["kind"], LucideIcon> = {
  offline: WifiOff,
  failed: AlertCircle,
  uploading: Upload,
};

export function UploadRow({ summary, onRetryAll, onClear }: UploadRowProps) {
  const offline = summary.kind === "offline";

  return (
    <div role="status" {...stylex.props(styles.root, offline && styles.offline)}>
      <Icon icon={ICONS[summary.kind]} size={20} />
      <span {...stylex.props(styles.text, offline && styles.offlineText)}>{rowText(summary)}</span>
      {summary.kind === "uploading" && (
        <span {...stylex.props(styles.meta)}>{copy.photos.tile.percent(summary.percent)}</span>
      )}
      {summary.kind === "failed" && (
        <div {...stylex.props(styles.actions)}>
          {summary.retryable && (
            <Button variant="ghost" icon={RotateCw} onClick={onRetryAll}>
              {copy.photos.row.retryAll}
            </Button>
          )}
          <Button variant="ghost" onClick={onClear}>
            {copy.photos.row.clear}
          </Button>
        </div>
      )}
    </div>
  );
}

function uploadingText(summary: Extract<UploadSummary, { kind: "uploading" }>): string {
  const running = summary.one
    ? copy.photos.row.uploadingOne(summary.one)
    : copy.photos.row.uploadingMany(summary.count);

  return summary.failed > 0 ? `${running} · ${copy.photos.row.failed(summary.failed)}` : running;
}

function rowText(summary: ShownSummary): string {
  switch (summary.kind) {
    case "offline":
      return summary.paused > 0
        ? copy.photos.row.offlinePaused(summary.paused)
        : copy.photos.row.offline;
    case "failed":
      return copy.photos.row.failed(summary.failed);
    case "uploading":
      return uploadingText(summary);
  }
}
