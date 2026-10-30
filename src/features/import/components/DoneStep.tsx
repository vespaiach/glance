import * as stylex from "@stylexjs/stylex";
import { Check } from "lucide-react";
import { copy } from "@/copy";
import { season } from "@/theme/seasons.stylex";
import { colors } from "@/theme/tokens.stylex";
import { Icon } from "@/ui/Icon";
import type { ImportDone } from "../importPage";
import { panel } from "./importStyles";

type DoneStepProps = {
  done: ImportDone;
  who: string;
};

const words = copy.import;

const styles = stylex.create({
  block: {
    flexGrow: 1,
    justifyContent: "center",
    padding: "clamp(28px, 4vw, 56px)",
    backgroundColor: season.block3,
  },
  check: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
  added: {
    margin: 0,
    fontSize: "clamp(44px, 5.6vw, 86px)",
    fontWeight: 540,
    letterSpacing: "-1.72px",
    lineHeight: 1,
  },
  line: {
    margin: 0,
    fontSize: "clamp(18px, 1.8vw, 24px)",
    fontWeight: 330,
    lineHeight: 1.4,
    textWrap: "pretty",
  },
});

export function DoneStep({ done, who }: DoneStepProps) {
  const range = words.range(done.range.from, done.range.to);

  return (
    <section role="status" {...stylex.props(panel.card, styles.block)}>
      <span {...stylex.props(panel.round("80px"), styles.check)}>
        <Icon icon={Check} size={40} />
      </span>
      <h2 {...stylex.props(styles.added)}>{words.done.added(done.count)}</h2>
      <p {...stylex.props(styles.line)}>
        {words.done.line(who, range, done.duplicates, done.matched)}
      </p>
      <span {...stylex.props(panel.mono)}>{words.done.undoNote}</span>
    </section>
  );
}
