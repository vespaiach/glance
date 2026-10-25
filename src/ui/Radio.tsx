"use client";

import * as stylex from "@stylexjs/stylex";
import type { LucideIcon } from "lucide-react";
import { type KeyboardEvent, useRef } from "react";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "./Icon";
import { press } from "./press";

type RadioOption<T extends string | number> = { value: T; label: string; icon?: LucideIcon };

type RadioProps<T extends string | number> = {
  label: string;
  options: readonly RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  direction?: "row" | "column";
  xstyle?: stylex.StyleXStyles;
};

const STEP_KEYS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

const styles = stylex.create({
  group: {
    display: "flex",
    minWidth: 0,
  },
  row: {
    flexWrap: "nowrap",
    alignItems: "center",
    columnGap: 24,
    flexShrink: 0,
  },
  column: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  radio: {
    minHeight: 56,
    display: "flex",
    alignItems: "center",
    gap: 10,
    paddingBlock: 0,
    paddingInline: 4,
    borderWidth: 0,
    backgroundColor: "transparent",
    fontFamily: type.fontSans,
    fontSize: 18,
    fontWeight: 330,
    color: colors.textPrimary,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  withIcon: {
    gap: 12,
  },
  checked: {
    fontWeight: 540,
  },
  ring: {
    width: 24,
    height: 24,
    flexShrink: 0,
    boxSizing: "border-box",
    borderRadius: radii.full,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: colors.black,
    display: "grid",
    placeItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
    backgroundColor: colors.black,
    transform: "scale(0)",
    transitionProperty: "transform",
    transitionDuration: motion.durFast,
    transitionTimingFunction: motion.easeOut,
  },
  dotOn: {
    transform: "scale(1)",
  },
  icon: {
    display: "flex",
    flexShrink: 0,
  },
});

export function Radio<T extends string | number>({
  label,
  options,
  value,
  onChange,
  direction = "row",
  xstyle,
}: RadioProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const step = STEP_KEYS[event.key];

    if (step === undefined) return;

    event.preventDefault();

    const next = (index + step + options.length) % options.length;

    buttons.current[next]?.focus();

    onChange(options[next]?.value ?? value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      {...stylex.props(styles.group, styles[direction], xstyle)}
    >
      {options.map((option, index) => {
        const checked = option.value === value;

        return (
          // biome-ignore lint/a11y/useSemanticElements: a styled button keeps the 56 px touch row, the icon and the press scale; role and keys follow the ARIA radio group
          <button
            key={option.value}
            ref={(button) => {
              buttons.current[index] = button;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            {...stylex.props(
              styles.radio,
              option.icon && styles.withIcon,
              checked && styles.checked,
              press.scale,
            )}
          >
            <span aria-hidden="true" {...stylex.props(styles.ring)}>
              <span {...stylex.props(styles.dot, checked && styles.dotOn)} />
            </span>
            {option.icon && (
              <span {...stylex.props(styles.icon)}>
                <Icon icon={option.icon} size={20} />
              </span>
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
