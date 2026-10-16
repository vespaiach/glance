import * as stylex from "@stylexjs/stylex";
import { formatLongDate, minutesOfDay, timeParts } from "@/domain/time";
import { space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "./Eyebrow";

type ClockProps = {
  time: Date;
  tz: string;
  hour12?: boolean;
  showDate?: boolean;
  size?: "xl" | "lg";
  align?: "left" | "center";
  xstyle?: stylex.StyleXStyles;
};

const blink = stylex.keyframes({
  "0%, 49%": { opacity: 1 },
  "50%, 100%": { opacity: 0 },
});

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
  colon: {
    animationName: blink,
    animationDuration: "1.2s",
    animationTimingFunction: "steps(1, end)",
    animationIterationCount: "infinite",
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
  tz,
  hour12 = true,
  showDate = true,
  size = "xl",
  align = "left",
  xstyle,
}: ClockProps) {
  const reading = timeParts(minutesOfDay(time, tz), hour12 ? "12h" : "24h");
  const times = reading.time.split(":");
  const hour = times[0];
  const minute = times[1];
  const xl = size === "xl";

  return (
    <div {...stylex.props(styles.root, align === "center" && styles.center, xstyle)}>
      {showDate && <Eyebrow>{formatLongDate(time, tz)}</Eyebrow>}
      <div {...stylex.props(styles.reading)}>
        <span {...stylex.props(styles.time, xl ? styles.timeXl : styles.timeLg)}>
          {hour}
          <span {...stylex.props(styles.colon)}>:</span>
          {minute}
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
