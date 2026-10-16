import * as stylex from "@stylexjs/stylex";
import { RotateCw, X } from "lucide-react";
import { copy } from "@/copy";
import { season } from "@/theme/seasons.stylex";
import { radii, shadows } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { QrCode } from "@/ui/QrCode";
import type { QrTile } from "../qrTile";

export type QrTileShown = { tile: QrTile; secondsLeft: number };

type QrSignInTileProps = QrTileShown & {
  email: string;
  online: boolean;
  onRetry: () => void;
  onClose: () => void;
};

const text = copy.settings.account.qr;

const styles = stylex.create({
  tile: {
    alignSelf: "stretch",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "20px 24px",
    padding: 20,
    boxSizing: "border-box",
    borderRadius: radii.md,
    backgroundColor: season.block1,
  },
  words: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
    minWidth: 200,
    flexGrow: 1,
    flexBasis: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: 540,
    letterSpacing: "-0.2px",
  },
  body: {
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  countdown: {
    fontVariantNumeric: "tabular-nums",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  retry: {
    boxShadow: shadows.shadow1,
  },
  done: {
    marginLeft: -16,
  },
});

export function QrSignInTile({
  tile,
  secondsLeft,
  email,
  online,
  onRetry,
  onClose,
}: QrSignInTileProps) {
  const failed = tile.kind === "failed";

  return (
    <div {...stylex.props(styles.tile)}>
      <QrCode value={tile.kind === "open" ? tile.url : undefined} label={text.label} />
      <div {...stylex.props(styles.words)}>
        <span {...stylex.props(styles.title)}>{text.title}</span>
        <span {...stylex.props(styles.body)}>{failed ? text.failed : text.body(email)}</span>
        {!failed && (
          <Eyebrow size="caption" xstyle={styles.countdown}>
            {text.expires(secondsLeft)}
          </Eyebrow>
        )}
        <div {...stylex.props(styles.actions)}>
          {failed && (
            <Button
              variant="secondary"
              icon={RotateCw}
              disabled={!online}
              onClick={onRetry}
              xstyle={styles.retry}
            >
              {text.retry}
            </Button>
          )}
          <Button variant="ghost" icon={X} onClick={onClose} xstyle={!failed && styles.done}>
            {text.done}
          </Button>
        </div>
      </div>
    </div>
  );
}
