import * as stylex from "@stylexjs/stylex";
import { Upload, X } from "lucide-react";
import { copy } from "@/copy";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { QrCode } from "@/ui/QrCode";

export type QrShown = { url?: string };

type AddFromPhoneProps = {
  qr: QrShown;
  onChooseFiles: () => void;
};

type PanelProps = AddFromPhoneProps & { onDone: () => void };

const words = copy.photos.qr;

const PANEL_CODE_PX = 125;

const styles = stylex.create({
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: space.sm,
    padding: space.md,
    boxSizing: "border-box",
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.md,
  },
  words: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 160,
  },
  title: {
    fontSize: 18,
    fontWeight: 540,
    letterSpacing: "-0.2px",
  },
  body: {
    fontSize: 15,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: space.xs,
  },
  card: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: space.lg,
    maxWidth: 560,
    padding: space.lg,
    boxSizing: "border-box",
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
    textAlign: "left",
  },
  cardWords: {
    gap: space.xs,
    minWidth: 220,
  },
  cardTitle: {
    fontSize: 20,
  },
  cardAction: {
    display: "flex",
    marginTop: 4,
    marginLeft: -16,
  },
});

export function AddFromPhonePanel({ qr, onChooseFiles, onDone }: PanelProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset can't lay out its content as a flex column
    <div role="group" aria-label={words.name} {...stylex.props(styles.panel)}>
      <div {...stylex.props(styles.row)}>
        <QrCode value={qr.url} label={words.code} size={PANEL_CODE_PX} />
        <div {...stylex.props(styles.words)}>
          <span {...stylex.props(styles.title)}>{words.title}</span>
          <span {...stylex.props(styles.body)}>{words.body}</span>
        </div>
      </div>
      <div {...stylex.props(styles.actions)}>
        <Button variant="secondary" icon={Upload} onClick={onChooseFiles}>
          {words.chooseFiles}
        </Button>
        <Button variant="ghost" icon={X} onClick={onDone}>
          {words.done}
        </Button>
      </div>
    </div>
  );
}

export function AddFromPhoneCard({ qr, onChooseFiles }: AddFromPhoneProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset can't lay out its content as a wrapping flex row
    <div role="group" aria-label={words.name} {...stylex.props(styles.card)}>
      <QrCode value={qr.url} label={words.code} />
      <div {...stylex.props(styles.words, styles.cardWords)}>
        <span {...stylex.props(styles.title, styles.cardTitle)}>{words.title}</span>
        <span {...stylex.props(styles.body)}>{words.body}</span>
        <div {...stylex.props(styles.cardAction)}>
          <Button variant="ghost" icon={Upload} onClick={onChooseFiles}>
            {words.chooseFiles}
          </Button>
        </div>
      </div>
    </div>
  );
}
