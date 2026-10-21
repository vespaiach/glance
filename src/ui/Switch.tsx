import * as stylex from "@stylexjs/stylex";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";

type SwitchProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelStyle?: "body" | "eyebrow";
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  row: {
    minHeight: 56,
    alignSelf: "flex-start",
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    fontFamily: type.fontSans,
    fontSize: type.bodyLgSize,
    fontWeight: type.bodyLgWeight,
    letterSpacing: type.bodyLgLs,
    color: colors.textPrimary,
    cursor: "pointer",
    textAlign: "left",
  },
  eyebrow: {
    minHeight: 44,
    fontFamily: type.fontMono,
    fontSize: type.eyebrowSize,
    fontWeight: 400,
    lineHeight: type.eyebrowLh,
    letterSpacing: type.eyebrowLs,
    textTransform: "uppercase",
  },
  track: {
    position: "relative",
    flexShrink: 0,
    width: 56,
    height: 32,
    boxSizing: "border-box",
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    boxShadow: `inset 0 0 0 1px ${colors.borderHairline}`,
    transitionProperty: "background-color, box-shadow",
    transitionDuration: motion.durFast,
    transitionTimingFunction: motion.easeOut,
  },
  trackOn: {
    backgroundColor: colors.black,
    boxShadow: "none",
  },
  knob: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    boxShadow: `0 1px 2px ${colors.borderHairline}`,
    transitionProperty: "left",
    transitionDuration: motion.durFast,
    transitionTimingFunction: motion.easeOut,
  },
  knobOn: {
    left: 28,
  },
});

export function Switch({ label, checked, onChange, labelStyle = "body", xstyle }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      {...stylex.props(styles.row, labelStyle === "eyebrow" && styles.eyebrow, xstyle)}
    >
      {label}
      <SwitchTrack checked={checked} />
    </button>
  );
}

export function SwitchTrack({ checked }: { checked: boolean }) {
  return (
    <span aria-hidden="true" {...stylex.props(styles.track, checked && styles.trackOn)}>
      <span {...stylex.props(styles.knob, checked && styles.knobOn)} />
    </span>
  );
}
