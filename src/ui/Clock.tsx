import * as stylex from "@stylexjs/stylex";
import { formatLongDate, minutesOfDay, timeParts } from "@/domain/time";
import { space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "./Eyebrow";

type ClockProps = {
  time: Date;
  hour12?: boolean;
  showDate?: boolean;
  size?: "xl" | "lg";
  align?: "left" | "center";
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: space.md,
  },
  center: { alignItems: "center" },
  reading: {
    display: "flex",
    alignItems: "baseline",
    gap: space.sm,
  },
  time: {
    fontWeight: type.clockWeight,
    lineHeight: type.clockLh,
    fontVariantNumeric: "tabular-nums",
  },
  timeXl: {
    fontSize: type.clockSize,
    letterSpacing: type.clockLs,
  },
  timeLg: {
    fontSize: type.displayXlSize,
    letterSpacing: type.displayXlLs,
  },
  meridiem: {
    fontFamily: type.fontMono,
    letterSpacing: "0.6px",
  },
  meridiemXl: { fontSize: 28 },
  meridiemLg: { fontSize: 18 },
});

export function Clock({
  time,
  hour12 = true,
  showDate = true,
  size = "xl",
  align = "left",
  xstyle,
}: ClockProps) {
  const reading = timeParts(minutesOfDay(time), hour12 ? "12h" : "24h");
  const xl = size === "xl";

  return (
    <div {...stylex.props(styles.root, align === "center" && styles.center, xstyle)}>
      {showDate && <Eyebrow>{formatLongDate(time)}</Eyebrow>}
      <div {...stylex.props(styles.reading)}>
        <span {...stylex.props(styles.time, xl ? styles.timeXl : styles.timeLg)}>
          {reading.time}
        </span>
        {reading.meridiem && (
          <span {...stylex.props(styles.meridiem, xl ? styles.meridiemXl : styles.meridiemLg)}>
            {reading.meridiem}
          </span>
        )}
      </div>
    </div>
  );
}
