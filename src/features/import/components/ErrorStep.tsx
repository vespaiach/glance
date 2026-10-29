import * as stylex from "@stylexjs/stylex";
import { CalendarX, FileX, type LucideIcon, WifiOff } from "lucide-react";
import { copy } from "@/copy";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import type { ImportError, ImportPageAction } from "../importPage";
import { panel } from "./importStyles";

type ErrorStepProps = {
  error: ImportError;
  dispatch: (action: ImportPageAction) => void;
};

const ICONS: Record<ImportError, LucideIcon> = { type: FileX, empty: CalendarX, offline: WifiOff };

const styles = stylex.create({
  card: {
    flexGrow: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "clamp(28px, 4vw, 56px)",
  },
  title: {
    margin: 0,
    fontSize: "clamp(36px, 4.4vw, 64px)",
    fontWeight: 540,
    letterSpacing: "-0.96px",
    lineHeight: 1.1,
    textWrap: "pretty",
  },
  body: {
    margin: 0,
    maxWidth: 760,
    fontSize: "clamp(18px, 1.8vw, 24px)",
    fontWeight: 330,
    lineHeight: 1.4,
    textWrap: "pretty",
  },
});

export function ErrorStep({ error, dispatch }: ErrorStepProps) {
  const words = copy.import.errors[error];

  const act = () => dispatch(error === "offline" ? { type: "retry" } : { type: "source" });

  return (
    <section role="alert" {...stylex.props(panel.card, styles.card)}>
      <span {...stylex.props(panel.round("80px"), panel.onSoft)}>
        <Icon icon={ICONS[error]} size={36} />
      </span>
      <h2 {...stylex.props(styles.title)}>{words.title}</h2>
      <p {...stylex.props(styles.body)}>{words.body}</p>
      <Button size="lg" onClick={act}>
        {words.action}
      </Button>
    </section>
  );
}
