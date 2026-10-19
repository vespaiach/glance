import * as stylex from "@stylexjs/stylex";
import { type KeyboardEvent, useId } from "react";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";

type TextInputProps = {
  label?: string;
  ariaLabel?: string;
  caption?: string;
  type?: "text" | "date";
  max?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  size?: "md" | "lg";
  error?: string;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
  },
  caption: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
    textAlign: "right",
  },
  label: {
    fontFamily: type.fontSans,
    fontSize: type.bodyLgSize,
    fontWeight: type.bodyLgWeight,
    letterSpacing: type.bodyLgLs,
  },
  field: {
    fontFamily: type.fontSans,
    fontWeight: type.bodyWeight,
    letterSpacing: type.bodyLs,
    lineHeight: type.bodyLh,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceCanvas,
    boxSizing: "border-box",
    resize: "none",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: colors.borderHairline,
      ":focus": colors.black,
    },
    borderRadius: radii.md,
    outline: "none",
    boxShadow: {
      default: "none",
      ":focus": `0 0 0 2px ${colors.focusRing}`,
    },
    transitionProperty: "box-shadow",
    transitionDuration: motion.durFast,
  },
  md: {
    fontSize: type.bodySize,
    paddingBlock: 12,
    paddingInline: 14,
    minHeight: 48,
  },
  lg: {
    fontSize: 24,
    paddingBlock: 18,
    paddingInline: 20,
    minHeight: 64,
  },
  invalid: {
    borderColor: colors.danger,
    boxShadow: {
      default: "none",
      ":focus": `0 0 0 2px ${colors.danger}`,
    },
  },
  error: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
    color: colors.danger,
  },
});

const FIELDS = "input:not([disabled]):not([type=hidden]), textarea:not([disabled])";

export function TextInput({
  label,
  ariaLabel,
  caption,
  type: inputType = "text",
  max,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
  size = "md",
  error,
  xstyle,
}: TextInputProps) {
  const id = useId();

  const errorId = `${id}-error`;

  const invalid = Boolean(error);

  const fieldProps = {
    id,
    value,
    placeholder,
    "aria-label": ariaLabel,
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? errorId : undefined,
    ...stylex.props(styles.field, styles[size], invalid && styles.invalid),
  };

  return (
    <div {...stylex.props(styles.root, xstyle)}>
      {label && <LabelRow id={id} label={label} caption={caption} />}
      {multiline ? (
        <textarea {...fieldProps} rows={rows} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          {...fieldProps}
          type={inputType}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onReturn}
        />
      )}
      {invalid && (
        <span id={errorId} {...stylex.props(styles.error)}>
          {error}
        </span>
      )}
    </div>
  );
}

function nextField(input: HTMLInputElement): HTMLElement | undefined {
  const scope = input.form ?? input.closest('[role="dialog"]') ?? document.body;

  const fields = [...scope.querySelectorAll<HTMLElement>(FIELDS)];

  return fields[fields.indexOf(input) + 1];
}

function onReturn(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

  const input = event.currentTarget;

  const next = nextField(input);

  if (!next && input.form) return;

  event.preventDefault();

  if (next) next.focus();
  else input.blur();
}

function LabelRow({ id, label, caption }: { id: string; label: string; caption?: string }) {
  const name = (
    <label htmlFor={id} {...stylex.props(styles.label)}>
      {label}
    </label>
  );

  if (caption === undefined) return name;

  return (
    <div {...stylex.props(styles.labelRow)}>
      {name}
      <span {...stylex.props(styles.caption)}>{caption}</span>
    </div>
  );
}
