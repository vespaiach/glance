import * as stylex from "@stylexjs/stylex";
import { ArrowRight, Camera, CameraOff, Mail, RotateCw } from "lucide-react";
import { useId } from "react";
import { copy } from "@/copy";
import { season } from "@/theme/seasons.stylex";
import { radii } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import type { ScanAction } from "../scan";

type ScanSheetProps = {
  sheet: "ask" | "blocked" | "nocam";
  asking: boolean;
  onAction: (action: ScanAction) => void;
};

const text = copy.signIn.scan;

const BUTTONS = {
  ask: { icon: undefined, iconRight: ArrowRight, action: "continue" },
  blocked: { icon: RotateCw, iconRight: undefined, action: "continue" },
  nocam: { icon: Mail, iconRight: undefined, action: "close" },
} as const;

const styles = stylex.create({
  disc: {
    display: "grid",
    placeItems: "center",
    width: 64,
    height: 64,
    flexShrink: 0,
    borderRadius: radii.full,
    backgroundColor: season.block1,
  },
  message: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 340,
    letterSpacing: "-0.4px",
    lineHeight: 1.1,
  },
  body: {
    margin: 0,
    fontSize: 16,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  buttons: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
});

export function ScanSheet({ sheet, asking, onAction }: ScanSheetProps) {
  const titleId = useId();

  const close = () => onAction({ type: "close" });

  const button = BUTTONS[sheet];

  return (
    <Dialog labelledBy={titleId} bottom onClose={close}>
      <span {...stylex.props(styles.disc)}>
        <Icon icon={sheet === "ask" ? Camera : CameraOff} size={28} strokeWidth={1.5} />
      </span>
      <div {...stylex.props(styles.message)}>
        <Eyebrow>{text.eyebrow}</Eyebrow>
        <h2 id={titleId} {...stylex.props(styles.title)}>
          {text[sheet].title}
        </h2>
        <p {...stylex.props(styles.body)}>{text[sheet].body}</p>
      </div>
      <div {...stylex.props(styles.buttons)}>
        <Button
          icon={button.icon}
          iconRight={button.iconRight}
          disabled={asking}
          onClick={() => onAction({ type: button.action })}
        >
          {text[sheet].action}
        </Button>
        {sheet !== "nocam" && (
          <Button variant="ghost" onClick={close}>
            {text.cancel}
          </Button>
        )}
      </div>
    </Dialog>
  );
}
