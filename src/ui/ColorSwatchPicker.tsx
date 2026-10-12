import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import type { Tone } from "@/domain/schemas";
import { season } from "@/theme/seasons.stylex";
import { colors, motion, radii, space } from "@/theme/tokens.stylex";
import { press } from "./press";

type SwatchOption<T extends Tone> = { value: T; label: string };

type ColorSwatchPickerProps<T extends Tone> = {
  label: string;
  options: readonly SwatchOption<T>[];
  value: T;
  onChange: (value: T) => void;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  root: {
    borderWidth: 0,
    padding: 0,
    margin: 0,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: space.md,
    color: colors.textPrimary,
  },
  label: {
    fontSize: 18,
    fontWeight: 330,
  },
  swatches: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  swatch: {
    width: 44,
    height: 44,
    borderWidth: 0,
    padding: 0,
    borderRadius: radii.full,
    cursor: "pointer",
    boxShadow: `inset 0 0 0 1px ${colors.borderHairline}`,
    transitionProperty: "transform, box-shadow, background-color",
    transitionDuration: `${motion.durPress}, ${motion.durFast}, ${motion.durSeason}`,
    transitionTimingFunction: `${motion.easeOut}, ${motion.easeOut}, ${motion.easeInOut}`,
  },
  selected: {
    boxShadow: `0 0 0 3px ${colors.white}, 0 0 0 5px ${colors.black}`,
  },
  tone1: { backgroundColor: season.block1 },
  tone2: { backgroundColor: season.block2 },
  tone3: { backgroundColor: season.block3 },
  tone4: { backgroundColor: season.block4 },
  soft: { backgroundColor: season.soft },
  accent: { backgroundColor: season.accent },
});

function toneStyle(tone: Tone) {
  return typeof tone === "number" ? styles[`tone${tone}`] : styles[tone];
}

export function ColorSwatchPicker<T extends Tone>({
  label,
  options,
  value,
  onChange,
  xstyle,
}: ColorSwatchPickerProps<T>) {
  const labelId = useId();

  return (
    <fieldset aria-labelledby={labelId} {...stylex.props(styles.root, xstyle)}>
      <span id={labelId} {...stylex.props(styles.label)}>
        {label}
      </span>
      <div {...stylex.props(styles.swatches)}>
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.label}
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              {...stylex.props(
                styles.swatch,
                toneStyle(option.value),
                selected && styles.selected,
                press.scale,
              )}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
