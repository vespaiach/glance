import * as stylex from "@stylexjs/stylex";
import { RefreshCw } from "lucide-react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import { season } from "@/theme/seasons.stylex";
import { colors, radii } from "@/theme/tokens.stylex";
import { Button } from "@/ui/Button";
import { QrCode } from "@/ui/QrCode";
import { panel } from "./importStyles";

export type PhoneCode = { link?: string; endsIn: string };

type PhoneStepProps = {
  breakpoint: Breakpoint;
  code?: PhoneCode;
  onNewCode: () => void;
};

const words = copy.import.phone;

const QR_PX = 280;

const styles = stylex.create({
  code: {
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    backgroundColor: season.block1,
  },
  waiting: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    flexShrink: 0,
    borderRadius: radii.full,
    backgroundColor: season.accent,
  },
  steps: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
  },
  step: {
    minHeight: 72,
    display: "flex",
    alignItems: "center",
    gap: 20,
    borderTopWidth: { default: 1, ":first-child": 0 },
    borderTopStyle: "solid",
    borderTopColor: colors.borderHairlineSoft,
  },
  number: {
    fontSize: 20,
    fontWeight: 540,
  },
  actions: {
    display: "flex",
  },
});

const columns = stylex.create({
  large: { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" },
  normal: { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" },
  small: { gridTemplateColumns: "minmax(0, 1fr)" },
});

export function PhoneStep({ breakpoint, code, onNewCode }: PhoneStepProps) {
  return (
    <div {...stylex.props(panel.grid, columns[breakpoint])}>
      <section {...stylex.props(panel.card, styles.code)}>
        <QrCode value={code?.link} label={words.code} size={breakpoint === "small" ? 220 : QR_PX} />
        {code && (
          <span role="status" {...stylex.props(styles.waiting)}>
            <span {...stylex.props(styles.dot)} />
            <span {...stylex.props(panel.mono)}>{words.waiting(code.endsIn)}</span>
          </span>
        )}
      </section>
      <section {...stylex.props(panel.card)}>
        <h2 {...stylex.props(panel.headline)}>{words.headline}</h2>
        <ol {...stylex.props(styles.steps)}>
          {words.steps.map((step, index) => (
            <li key={step} {...stylex.props(styles.step)}>
              <span {...stylex.props(panel.round("48px"), panel.onSoft, styles.number)}>
                {index + 1}
              </span>
              <span {...stylex.props(panel.body)}>{step}</span>
            </li>
          ))}
        </ol>
        <span {...stylex.props(panel.spacer)} />
        <div {...stylex.props(styles.actions)}>
          <Button variant="secondary" icon={RefreshCw} onClick={onNewCode}>
            {words.newCode}
          </Button>
        </div>
      </section>
    </div>
  );
}
