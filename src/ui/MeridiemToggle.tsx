import * as stylex from "@stylexjs/stylex";
import type { Meridiem } from "@/domain/eventTimes";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";

type MeridiemToggleProps = {
  label: string;
  value: Meridiem;
  onChange: (meridiem: Meridiem) => void;
};

const MERIDIEMS: readonly Meridiem[] = ["AM", "PM"];

const styles = stylex.create({
  track: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    boxSizing: "border-box",
    width: 144,
    height: 44,
    margin: 0,
    padding: 4,
    minWidth: 0,
    borderWidth: 0,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceCanvas,
    boxShadow: `inset 0 0 0 1px ${colors.borderHairline}`,
  },
  knob: {
    position: "absolute",
    top: 4,
    left: 4,
    width: "calc(50% - 4px)",
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.actionPrimary,
    transform: "translateX(0)",
    transitionProperty: "transform",
    transitionDuration: {
      default: "220ms",
      "@media (prefers-reduced-motion: reduce)": "0ms",
    },
    transitionTimingFunction: motion.easeSlide,
  },
  knobPm: {
    transform: "translateX(100%)",
  },
  option: {
    position: "relative",
    borderWidth: 0,
    padding: 0,
    borderRadius: radii.pill,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    fontFamily: type.fontMono,
    fontSize: 15,
    letterSpacing: type.captionLs,
    cursor: "pointer",
    transitionProperty: "color",
    transitionDuration: "220ms",
    transitionTimingFunction: motion.easeSlide,
  },
  chosen: {
    color: colors.onActionPrimary,
  },
});

export function MeridiemToggle({ label, value, onChange }: MeridiemToggleProps) {
  return (
    <fieldset aria-label={label} {...stylex.props(styles.track)}>
      <span aria-hidden="true" {...stylex.props(styles.knob, value === "PM" && styles.knobPm)} />
      {MERIDIEMS.map((meridiem) => (
        <button
          key={meridiem}
          type="button"
          aria-pressed={meridiem === value}
          onClick={() => onChange(meridiem)}
          {...stylex.props(styles.option, meridiem === value && styles.chosen)}
        >
          {meridiem}
        </button>
      ))}
    </fieldset>
  );
}
