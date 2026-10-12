import * as stylex from "@stylexjs/stylex";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";

type PillOption<T extends string> = T | { value: T; label: string };

type PillTabsProps<T extends string> = {
  options: readonly PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  size?: "md" | "lg";
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  list: {
    borderWidth: 0,
    margin: 0,
    minWidth: 0,
    display: "inline-flex",
    gap: 4,
    padding: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceCanvas,
  },
  tab: {
    borderWidth: 0,
    cursor: "pointer",
    borderRadius: radii.pill,
    backgroundColor: "transparent",
    color: colors.textPrimary,
    fontFamily: type.fontSans,
    fontWeight: type.buttonWeight,
    letterSpacing: type.buttonLs,
    lineHeight: 1.2,
    transitionProperty: "background-color, color",
    transitionDuration: motion.durFast,
    transitionTimingFunction: motion.easeOut,
  },
  md: {
    paddingBlock: 8,
    paddingInline: 18,
    minHeight: 40,
    fontSize: type.buttonSize,
  },
  lg: {
    paddingBlock: 14,
    paddingInline: 28,
    minHeight: 56,
    fontSize: 22,
  },
  selected: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
  },
});

function normalize<T extends string>(option: PillOption<T>) {
  return typeof option === "string" ? { value: option, label: option } : option;
}

export function PillTabs<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  xstyle,
}: PillTabsProps<T>) {
  return (
    <fieldset aria-label={label} {...stylex.props(styles.list, xstyle)}>
      {options.map(normalize).map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            {...stylex.props(styles.tab, styles[size], selected && styles.selected)}
          >
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}
