import * as stylex from "@stylexjs/stylex";
import { Check, Copy, Plus, Trash2, X } from "lucide-react";
import { copy } from "@/copy";
import { season } from "@/theme/seasons.stylex";
import { colors, radii, shadows, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import type { ApiKeyRow as Row } from "../apiKeyRow";

export type SavedApiKey = { tail: string; used: string };

export type ApiKeyRowProps = {
  host: string;
  online: boolean;
  saved: SavedApiKey | null | undefined;
  row: Row;
  onCreate: () => void;
  onCopy: () => void;
  onDone: () => void;
  onAsk: () => void;
  onCancel: () => void;
  onRevoke: () => void;
};

const text = copy.settings.apiKey;

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space.md,
    paddingBlock: 20,
    color: colors.textPrimary,
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: `${space.sm} ${space.lg}`,
  },
  words: {
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
    minWidth: 180,
    flex: "1 1 240px",
  },
  title: {
    fontSize: type.headlineSize,
    fontWeight: type.headlineWeight,
    letterSpacing: type.headlineLs,
  },
  body: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
    textWrap: "pretty",
  },
  mono: {
    fontFamily: type.fontMono,
    fontSize: 14,
    letterSpacing: 0.6,
    lineHeight: 1.3,
    overflowWrap: "anywhere",
  },
  upper: {
    textTransform: "uppercase",
  },
  saved: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: `${space.xs} ${space.md}`,
  },
  ask: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    padding: "12px 12px 12px 16px",
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
  },
  askText: {
    flex: "1 1 200px",
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
    lineHeight: 1.4,
    textWrap: "pretty",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: space.xs,
  },
  shown: {
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
    padding: 20,
    borderRadius: radii.md,
    backgroundColor: season.block1,
  },
  shownBody: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  keyTile: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.sm,
    padding: "8px 8px 8px 16px",
    borderRadius: radii.md,
    backgroundColor: colors.surfaceCanvas,
  },
  key: {
    flex: "1 1 200px",
    minWidth: 0,
    fontFamily: type.fontMono,
    fontSize: 15,
    letterSpacing: 0.2,
    lineHeight: 1.4,
    overflowWrap: "anywhere",
    userSelect: "all",
  },
  ring: {
    boxShadow: shadows.shadow1,
  },
  done: {
    alignSelf: "flex-start",
  },
});

export function ApiKeyRow({
  host,
  online,
  saved,
  row,
  onCreate,
  onCopy,
  onDone,
  onAsk,
  onCancel,
  onRevoke,
}: ApiKeyRowProps) {
  const showCreate = saved === null && (row.kind === "idle" || row.kind === "creating");

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.header)}>
        <span {...stylex.props(styles.words)}>
          <span {...stylex.props(styles.title)}>{text.title}</span>
          <span {...stylex.props(styles.body)}>{text.body}</span>
          <span {...stylex.props(styles.mono)}>{text.endpoint(host)}</span>
        </span>
        {showCreate && (
          <Button
            variant="secondary"
            icon={Plus}
            disabled={!online || row.kind === "creating"}
            onClick={onCreate}
            xstyle={styles.ring}
          >
            {text.create}
          </Button>
        )}
        {saved && row.kind !== "shown" && (
          <SavedKey saved={saved} online={online} asking={row.kind === "asking"} onAsk={onAsk} />
        )}
      </div>
      {!online && row.kind === "idle" && (
        <span {...stylex.props(styles.mono, styles.upper)}>{text.offline}</span>
      )}
      {row.kind === "asking" && <RevokeQuestion onCancel={onCancel} onRevoke={onRevoke} />}
      {row.kind === "shown" && (
        <ShownKey apiKey={row.key} copied={row.copied} onCopy={onCopy} onDone={onDone} />
      )}
    </div>
  );
}

function SavedKey({
  saved,
  online,
  asking,
  onAsk,
}: {
  saved: SavedApiKey;
  online: boolean;
  asking: boolean;
  onAsk: () => void;
}) {
  return (
    <div {...stylex.props(styles.saved)}>
      <span {...stylex.props(styles.mono)}>
        <span>{text.masked(saved.tail)}</span>{" "}
        <span {...stylex.props(styles.upper)}>{saved.used}</span>
      </span>
      {!asking && (
        <Button
          variant="secondary"
          icon={Trash2}
          disabled={!online}
          onClick={onAsk}
          xstyle={styles.ring}
        >
          {text.revoke}
        </Button>
      )}
    </div>
  );
}

function RevokeQuestion({ onCancel, onRevoke }: { onCancel: () => void; onRevoke: () => void }) {
  return (
    <div {...stylex.props(styles.ask)}>
      <span {...stylex.props(styles.askText)}>{text.ask}</span>
      <div {...stylex.props(styles.actions)}>
        <Button variant="ghost" onClick={onCancel}>
          {text.cancel}
        </Button>
        <Button variant="primary" icon={Trash2} onClick={onRevoke}>
          {text.confirm}
        </Button>
      </div>
    </div>
  );
}

function ShownKey({
  apiKey,
  copied,
  onCopy,
  onDone,
}: {
  apiKey: string;
  copied: boolean;
  onCopy: () => void;
  onDone: () => void;
}) {
  return (
    <div role="status" {...stylex.props(styles.shown)}>
      <span {...stylex.props(styles.title)}>{text.shownTitle}</span>
      <span {...stylex.props(styles.shownBody)}>{text.shownBody}</span>
      <div {...stylex.props(styles.keyTile)}>
        <span {...stylex.props(styles.key)}>{apiKey}</span>
        <Button
          variant="secondary"
          icon={copied ? Check : Copy}
          onClick={onCopy}
          xstyle={styles.ring}
        >
          {copied ? text.copied : text.copy}
        </Button>
      </div>
      <Button variant="ghost" icon={X} onClick={onDone} xstyle={styles.done}>
        {text.done}
      </Button>
    </div>
  );
}
