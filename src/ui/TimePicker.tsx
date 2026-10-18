import * as stylex from "@stylexjs/stylex";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import {
  endForLength,
  type Meridiem,
  type MinuteStep,
  pickerHours,
  pickerMinutes,
  withHour,
  withMeridiem,
  withMinute,
} from "@/domain/eventTimes";
import { type Clock, formatClock, formatHour, timeParts } from "@/domain/time";
import { colors, motion, radii, shadows } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "./Button";
import { Eyebrow } from "./Eyebrow";
import { PillTabs } from "./PillTabs";
import { press } from "./press";

type TimePickerLabels = {
  hour: string;
  minutes: string;
  length: string;
  noEnd: string;
  done: string;
  hour24Cell: (hour: string) => string;
  minuteCell: (minutes: number) => string;
};

type LengthOption = { value: number; label: string };

type TimePickerEnds = {
  start: number;
  lengths: readonly LengthOption[];
  onNoEnd: () => void;
};

type TimePickerProps = {
  label: string;
  groupLabel: string;
  value: number;
  clock: Clock;
  labels: TimePickerLabels;
  onChange: (minutes: number) => void;
  onDone: () => void;
  ends?: TimePickerEnds;
  doneVariant?: "primary" | "secondary";
  minuteStep?: MinuteStep;
  compact?: boolean;
  xstyle?: stylex.StyleXStyles;
};

const MERIDIEMS: readonly Meridiem[] = ["AM", "PM"];

const styles = stylex.create({
  fieldset: {
    borderWidth: 0,
    padding: 0,
    margin: 0,
    minWidth: 0,
  },
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
  },
  compactRoot: {
    padding: 12,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    minHeight: 56,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  caption: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: 8,
  },
  compactGrid: {
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  },
  fourColumns: {
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  },
  cell: {
    height: 56,
    minWidth: 0,
    borderWidth: 0,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
    boxShadow: `inset 0 0 0 1px ${colors.borderHairline}`,
    fontFamily: type.fontSans,
    fontSize: 20,
    fontWeight: 340,
    fontVariantNumeric: "tabular-nums",
    cursor: "pointer",
    transitionProperty: "transform, background-color",
    transitionDuration: `${motion.durPress}, ${motion.durFast}`,
    transitionTimingFunction: motion.easeOut,
  },
  compactCell: {
    height: 48,
  },
  lengthCell: {
    paddingBlock: 0,
    paddingInline: 4,
    fontSize: 17,
    whiteSpace: "nowrap",
  },
  selected: {
    backgroundColor: colors.actionPrimary,
    color: colors.onActionPrimary,
    boxShadow: "none",
    fontWeight: 540,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  noEnd: {
    marginLeft: -8,
  },
  done: {
    boxShadow: shadows.shadow1,
  },
});

type CellProps = {
  label: string;
  ariaLabel?: string;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
  variant?: "time" | "length";
};

type SectionProps = {
  title: string;
  children: ReactNode;
  grid?: stylex.StyleXStyles;
};

export function TimePicker({
  label,
  groupLabel,
  value,
  clock,
  labels,
  onChange,
  onDone,
  ends,
  doneVariant = "secondary",
  minuteStep = 5,
  compact,
  xstyle,
}: TimePickerProps) {
  const ref = useScrollIntoView();

  const meridiem = timeParts(value, "12h").meridiem ?? "AM";

  const hour = Math.floor(value / 60);

  const minute = value % 60;

  const grid = compact ? styles.compactGrid : undefined;

  const minutes = pickerMinutes(minuteStep);

  const minuteGrid = minutes.length === 4 ? styles.fourColumns : grid;

  return (
    <fieldset
      ref={ref}
      aria-label={groupLabel}
      {...stylex.props(styles.fieldset, styles.root, compact && styles.compactRoot, xstyle)}
    >
      <div {...stylex.props(styles.header)}>
        <Eyebrow>{`${label} · ${formatClock(value, clock)}`}</Eyebrow>
        {clock === "12h" && (
          <PillTabs
            size="lg"
            options={MERIDIEMS}
            value={meridiem}
            onChange={(next) => onChange(withMeridiem(value, next))}
          />
        )}
      </div>
      <Section title={labels.hour} grid={grid}>
        {pickerHours(clock, meridiem).map((h) => (
          <Cell
            key={h}
            {...hourCell(h, clock, labels)}
            selected={h === hour}
            compact={compact}
            onClick={() => onChange(withHour(value, h))}
          />
        ))}
      </Section>
      <Section title={labels.minutes} grid={minuteGrid}>
        {minutes.map((m) => (
          <Cell
            key={m}
            label={String(m).padStart(2, "0")}
            ariaLabel={labels.minuteCell(m)}
            selected={m === minute}
            compact={compact}
            onClick={() => onChange(withMinute(value, m))}
          />
        ))}
      </Section>
      {ends && (
        <Section title={labels.length} grid={styles.fourColumns}>
          {ends.lengths.map((length) => (
            <Cell
              key={length.value}
              label={length.label}
              variant="length"
              selected={value === ends.start + length.value}
              compact={compact}
              onClick={() => onChange(endForLength(ends.start, length.value))}
            />
          ))}
        </Section>
      )}
      <div {...stylex.props(styles.footer)}>
        <div>
          {ends && (
            <Button variant="ghost" icon={X} onClick={ends.onNoEnd} xstyle={styles.noEnd}>
              {labels.noEnd}
            </Button>
          )}
        </div>
        <Button
          variant={doneVariant}
          onClick={onDone}
          xstyle={doneVariant === "secondary" && styles.done}
        >
          {labels.done}
        </Button>
      </div>
    </fieldset>
  );
}

function Cell({ label, ariaLabel, selected, onClick, compact, variant = "time" }: CellProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={onClick}
      {...stylex.props(
        styles.cell,
        compact && styles.compactCell,
        variant === "length" && styles.lengthCell,
        selected && styles.selected,
        press.scale,
      )}
    >
      {label}
    </button>
  );
}

function Section({ title, children, grid }: SectionProps) {
  const titleId = useId();

  return (
    <div {...stylex.props(styles.section)}>
      <span id={titleId} {...stylex.props(styles.caption)}>
        {title}
      </span>
      <fieldset aria-labelledby={titleId} {...stylex.props(styles.fieldset, styles.grid, grid)}>
        {children}
      </fieldset>
    </div>
  );
}

function hourCell(hour: number, clock: Clock, labels: TimePickerLabels) {
  if (clock === "12h")
    return { label: String(hour % 12 || 12), ariaLabel: formatHour(hour * 60, clock) };

  const label = String(hour).padStart(2, "0");

  return { label, ariaLabel: labels.hour24Cell(label) };
}

function useScrollIntoView() {
  const ref = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  return ref;
}
