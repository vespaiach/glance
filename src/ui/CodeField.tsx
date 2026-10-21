import * as stylex from "@stylexjs/stylex";
import { useEffect, useId, useRef, useState } from "react";
import { colors, motion, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";

type CodeFieldProps = {
  label: string;
  value: string;
  onChange: (text: string) => void;
  error?: string;
  busy?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
};

const CELLS = [0, 1, 2, 3, 4, 5] as const;

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontFamily: type.fontSans,
    fontSize: type.bodyLgSize,
    fontWeight: type.bodyLgWeight,
    letterSpacing: type.bodyLgLs,
  },
  cells: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: 8,
    maxWidth: 456,
  },
  cell: {
    height: "clamp(56px, 5vw, 72px)",
    borderRadius: radii.md,
    backgroundColor: colors.surfaceCanvas,
    boxShadow: `inset 0 0 0 1px ${colors.borderHairline}`,
    display: "grid",
    placeItems: "center",
    fontFamily: type.fontMono,
    fontSize: "clamp(28px, 2.4vw, 36px)",
    fontVariantNumeric: "tabular-nums",
    color: colors.textPrimary,
    transitionProperty: "box-shadow",
    transitionDuration: motion.durFast,
  },
  active: {
    boxShadow: `inset 0 0 0 1px ${colors.black}, 0 0 0 2px ${colors.focusRing}`,
  },
  invalid: {
    boxShadow: `inset 0 0 0 1px ${colors.danger}`,
  },
  invalidActive: {
    boxShadow: `inset 0 0 0 1px ${colors.danger}, 0 0 0 2px ${colors.danger}`,
  },
  input: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    margin: 0,
    padding: 0,
    borderWidth: 0,
    opacity: 0,
    fontSize: 16,
    cursor: "text",
  },
  error: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
    color: colors.danger,
  },
});

export function CodeField({
  label,
  value,
  onChange,
  error,
  busy = false,
  disabled = false,
  autoFocus = false,
}: CodeFieldProps) {
  const id = useId();

  const errorId = `${id}-error`;

  const input = useRef<HTMLInputElement>(null);

  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  const invalid = Boolean(error);

  const active = focused && !busy && !disabled ? Math.min(value.length, CELLS.length - 1) : -1;

  return (
    <div {...stylex.props(styles.root)}>
      <label htmlFor={id} {...stylex.props(styles.label)}>
        {label}
      </label>
      <div {...stylex.props(styles.cells)}>
        {CELLS.map((cell) => (
          <span
            key={cell}
            aria-hidden="true"
            {...stylex.props(cellStyle(invalid, cell === active))}
          >
            {value[cell] ?? ""}
          </span>
        ))}
        <input
          ref={input}
          id={id}
          value={value}
          inputMode="numeric"
          autoComplete="one-time-code"
          readOnly={busy}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...stylex.props(styles.input)}
        />
      </div>
      {invalid && (
        <span id={errorId} role="alert" {...stylex.props(styles.error)}>
          {error}
        </span>
      )}
    </div>
  );
}

function cellStyle(invalid: boolean, active: boolean) {
  if (invalid) return [styles.cell, active ? styles.invalidActive : styles.invalid];

  return [styles.cell, active && styles.active];
}
