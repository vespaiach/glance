import * as stylex from "@stylexjs/stylex";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Slider } from "@/ui/Slider";
import { Switch } from "@/ui/Switch";

type TileText = {
  title: string;
  value: (value: number) => string;
  on: string;
  off: string;
  slider: string;
};

type SwitchSliderTileProps = {
  text: TileText;
  range: { min: number; max: number };
  on: boolean;
  value: number;
  onChange: (on: boolean, value: number) => void;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
  },
  header: {
    width: "100%",
    justifyContent: "space-between",
  },
  tile: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.md,
    paddingBlock: space.md,
    paddingInline: 20,
  },
  reading: {
    display: "flex",
    alignItems: "baseline",
    gap: space.xs,
  },
  value: {
    fontSize: 28,
    fontWeight: 340,
    letterSpacing: "-0.4px",
    fontVariantNumeric: "tabular-nums",
  },
  struck: {
    textDecoration: "line-through",
  },
  caption: {
    fontSize: type.bodySmSize,
    fontWeight: type.bodySmWeight,
  },
});

export function SwitchSliderTile({ text, range, on, value, onChange }: SwitchSliderTileProps) {
  return (
    <div {...stylex.props(styles.root)}>
      <Switch
        label={text.title}
        checked={on}
        onChange={(checked) => onChange(checked, value)}
        labelStyle="eyebrow"
        xstyle={styles.header}
      />
      <div {...stylex.props(styles.tile)}>
        <div {...stylex.props(styles.reading)}>
          <span {...stylex.props(styles.value, !on && styles.struck)}>{text.value(value)}</span>
          <span {...stylex.props(styles.caption)}>{on ? text.on : text.off}</span>
        </div>
        <Slider
          label={text.slider}
          min={range.min}
          max={range.max}
          value={value}
          valueText={text.value(value)}
          minLabel={text.value(range.min)}
          maxLabel={text.value(range.max)}
          onChange={(next) => onChange(true, next)}
          disabled={!on}
        />
      </div>
    </div>
  );
}
