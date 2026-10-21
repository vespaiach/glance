import * as stylex from "@stylexjs/stylex";
import { colors } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";

type SliderProps = {
  label: string;
  min: number;
  max: number;
  value: number;
  valueText: string;
  minLabel: string;
  maxLabel: string;
  onChange: (value: number) => void;
  disabled?: boolean;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
  },
  input: {
    width: "100%",
    height: 44,
    margin: 0,
    accentColor: colors.black,
    cursor: "pointer",
  },
  disabled: {
    accentColor: colors.borderHairline,
    cursor: "default",
  },
  ends: {
    display: "flex",
    justifyContent: "space-between",
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
  },
});

export function Slider({
  label,
  min,
  max,
  value,
  valueText,
  minLabel,
  maxLabel,
  onChange,
  disabled = false,
}: SliderProps) {
  return (
    <div {...stylex.props(styles.root)}>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={valueText}
        onChange={(event) => onChange(Number(event.target.value))}
        {...stylex.props(styles.input, disabled && styles.disabled)}
      />
      <div aria-hidden="true" {...stylex.props(styles.ends)}>
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
