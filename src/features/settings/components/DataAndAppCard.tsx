import * as stylex from "@stylexjs/stylex";
import { Check, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { copy } from "@/copy";
import { colors, radii, shadows, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import type { RefreshData } from "../refreshData";

type DataAndAppCardProps = {
  online: boolean;
  refresh: RefreshData;
  updatedMinutes?: number;
  onRefresh: () => void;
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
});

export function DataAndAppCard({
  online,
  refresh,
  updatedMinutes,
  onRefresh,
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
    </section>
  );
}

function refreshStatus(online: boolean, refresh: RefreshData, minutes: number | undefined) {
  if (!online) return text.refresh.offline(minutes);

  if (refresh.kind === "busy") return text.refresh.busy;

  if (refresh.kind === "fail") return text.refresh.failed;

  return minutes === undefined ? null : text.refresh.updated(minutes);
}
