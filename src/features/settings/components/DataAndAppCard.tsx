import * as stylex from "@stylexjs/stylex";
import { Check, LoaderCircle, Power, RefreshCw, RotateCw, TriangleAlert } from "lucide-react";
import { copy } from "@/copy";
import { isNewerVersion } from "@/domain/build";
import { season } from "@/theme/seasons.stylex";
import { colors, radii, shadows, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import type { RefreshData } from "../refreshData";
import type { ReloadAppRow } from "../useReloadApp";

type DataAndAppCardProps = {
  online: boolean;
  refresh: RefreshData;
  updatedMinutes?: number;
  onRefresh: () => void;
  reloadApp: ReloadAppRow;
};

const text = copy.settings.dataAndApp;

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.lg,
    boxShadow: shadows.shadow1,
    padding: "clamp(20px, 2.4vw, 32px)",
    boxSizing: "border-box",
    color: colors.textPrimary,
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: `${space.sm} ${space.md}`,
  },
  words: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
    flex: "1 1 240px",
  },
  title: {
    fontSize: 17,
    fontWeight: 540,
    letterSpacing: "-0.1px",
  },
  body: {
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.4,
    textWrap: "pretty",
  },
  status: {
    display: "flex",
    alignItems: "center",
    gap: space.xs,
    minHeight: 18,
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    lineHeight: 1.3,
  },
  statusIcon: {
    display: "flex",
    flexShrink: 0,
  },
  danger: {
    color: colors.danger,
  },
  ring: {
    boxShadow: shadows.shadow1,
  },
  divided: {
    paddingTop: space.md,
    boxShadow: `inset 0 1px 0 ${colors.borderHairlineSoft}`,
  },
  dot: {
    width: 10,
    height: 10,
    flexShrink: 0,
    borderRadius: radii.full,
    backgroundColor: season.accent,
  },
  ask: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    flex: "1 1 100%",
    minWidth: 0,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    padding: `${space.sm} ${space.sm} ${space.sm} ${space.md}`,
    boxSizing: "border-box",
  },
  askText: {
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.4,
    textWrap: "pretty",
    flex: "1 1 200px",
  },
  askButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: space.xs,
  },
  cover: {
    position: "fixed",
    inset: 0,
    zIndex: 60,
    display: "grid",
    placeItems: "center",
    padding: space.lg,
    boxSizing: "border-box",
    backgroundColor: colors.surfaceCanvas,
  },
  coverBody: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space.lg,
    textAlign: "center",
    maxWidth: 420,
  },
  coverIcon: {
    display: "grid",
    placeItems: "center",
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: season.block1,
  },
  coverWords: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space.sm,
  },
  coverTitle: {
    fontSize: type.displayLgSize,
    fontWeight: 340,
    letterSpacing: "-0.8px",
    lineHeight: 1.1,
  },
  coverText: {
    fontSize: 17,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
});

export function DataAndAppCard({
  online,
  refresh,
  updatedMinutes,
  onRefresh,
  reloadApp,
}: DataAndAppCardProps) {
  const busy = refresh.kind === "busy";

  return (
    <section aria-label={text.title} {...stylex.props(styles.root)}>
      <Eyebrow>{text.title}</Eyebrow>
      <div {...stylex.props(styles.row)}>
        <div {...stylex.props(styles.words)}>
          <span {...stylex.props(styles.title)}>{text.refresh.title}</span>
          <span {...stylex.props(styles.body)}>{text.refresh.body}</span>
          <span role="status" aria-live="polite" {...stylex.props(styles.status)}>
            {online && refresh.kind === "fail" && (
              <span {...stylex.props(styles.statusIcon, styles.danger)}>
                <Icon icon={TriangleAlert} size={18} />
              </span>
            )}
            {online && refresh.kind === "done" && (
              <span {...stylex.props(styles.statusIcon)}>
                <Icon icon={Check} size={18} />
              </span>
            )}
            {refreshStatus(online, refresh, updatedMinutes)}
          </span>
        </div>
        <Button
          variant="secondary"
          icon={busy ? LoaderCircle : RefreshCw}
          disabled={!online || busy}
          onClick={onRefresh}
          xstyle={styles.ring}
        >
          {busy ? text.refresh.busyButton : text.refresh.button}
        </Button>
      </div>
      <ReloadRow online={online} {...reloadApp} />
    </section>
  );
}

function ReloadRow({
  online,
  current,
  next,
  reload,
  onAsk,
  onCancel,
  onReload,
}: ReloadAppRow & { online: boolean }) {
  const ready = next !== undefined && isNewerVersion(next, current);

  const target = ready ? next : current;

  return (
    <div {...stylex.props(styles.row, styles.divided)}>
      <div {...stylex.props(styles.words)}>
        <span {...stylex.props(styles.title)}>{text.reload.title}</span>
        <span {...stylex.props(styles.body)}>{text.reload.body}</span>
        <span role="status" aria-live="polite" {...stylex.props(styles.status)}>
          {online && ready && <span {...stylex.props(styles.dot)} />}
          {reloadStatus(online, ready, target, current)}
        </span>
      </div>
      {reload.kind === "asking" ? (
        <div {...stylex.props(styles.ask)}>
          <span {...stylex.props(styles.askText)}>{text.reload.confirm}</span>
          <div {...stylex.props(styles.askButtons)}>
            <Button variant="ghost" onClick={onCancel}>
              {text.reload.cancel}
            </Button>
            <Button variant="primary" icon={RotateCw} onClick={onReload}>
              {text.reload.reloadNow}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant={ready ? "primary" : "secondary"}
          icon={Power}
          disabled={!online}
          onClick={onAsk}
          xstyle={!ready && styles.ring}
        >
          {text.reload.button}
        </Button>
      )}
      {reload.kind === "reloading" && <ReloadingCover version={target} />}
    </div>
  );
}

function ReloadingCover({ version }: { version: string }) {
  return (
    <div role="alert" aria-busy="true" {...stylex.props(styles.cover)}>
      <div {...stylex.props(styles.coverBody)}>
        <span {...stylex.props(styles.coverIcon)}>
          <Icon icon={RotateCw} size={34} strokeWidth={1.5} />
        </span>
        <div {...stylex.props(styles.coverWords)}>
          <div {...stylex.props(styles.coverTitle)}>{text.reload.coverTitle}</div>
          <span {...stylex.props(styles.coverText)}>{text.reload.coverBody}</span>
        </div>
        <Eyebrow>{text.reload.version(version)}</Eyebrow>
      </div>
    </div>
  );
}

function reloadStatus(online: boolean, ready: boolean, target: string, current: string) {
  if (!online) return text.reload.offline;

  return ready ? text.reload.ready(target, current) : text.reload.upToDate(current);
}

function refreshStatus(online: boolean, refresh: RefreshData, minutes: number | undefined) {
  if (!online) return text.refresh.offline(minutes);

  if (refresh.kind === "busy") return text.refresh.busy;

  if (refresh.kind === "fail") return text.refresh.failed;

  return minutes === undefined ? null : text.refresh.updated(minutes);
}
