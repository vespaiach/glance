import * as stylex from "@stylexjs/stylex";
import { Droplet } from "lucide-react";
import type { WeatherIcon } from "@/domain/schemas";
import { colors, motion, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Icon } from "./Icon";
import { press } from "./press";
import { weatherIcons } from "./weatherIcons";

type ForecastDayProps = {
  day: string;
  icon: WeatherIcon;
  iconLabel?: string;
  high: number;
  low: number;
  precip?: number;
  active?: boolean;
  onClick?: () => void;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  root: {
    borderWidth: 0,
    font: "inherit",
    color: colors.textPrimary,
    textAlign: "center",
    backgroundColor: "transparent",
    borderRadius: radii.md,
    paddingBlock: space.lg,
    paddingInline: space.md,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space.md,
    minWidth: 0,
    transitionProperty: "background-color, transform",
    transitionDuration: `${motion.durFast}, ${motion.durPress}`,
    transitionTimingFunction: motion.easeOut,
  },
  button: { cursor: "pointer" },
  active: { backgroundColor: colors.surfaceCanvas },
  day: {
    fontFamily: type.fontMono,
    fontSize: type.eyebrowSize,
    letterSpacing: type.eyebrowLs,
    textTransform: "uppercase",
  },
  temps: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  high: {
    fontSize: 32,
    fontWeight: 480,
    letterSpacing: "-0.6px",
    lineHeight: 1.1,
  },
  low: {
    fontSize: 20,
    fontWeight: 330,
    lineHeight: 1.2,
  },
  precip: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    display: "flex",
    gap: space.xxs,
    alignItems: "center",
  },
});

export function ForecastDay({
  day,
  icon,
  iconLabel,
  high,
  low,
  precip,
  active,
  onClick,
  xstyle,
}: ForecastDayProps) {
  const rootStyles = [styles.root, active && styles.active];

  const content = (
    <>
      <span {...stylex.props(styles.day)}>{day}</span>
      <Icon icon={weatherIcons[icon]} size={48} label={iconLabel} />
      <span {...stylex.props(styles.temps)}>
        <span {...stylex.props(styles.high)}>{high}°</span>
        <span {...stylex.props(styles.low)}>{low}°</span>
      </span>
      {precip !== undefined && (
        <span {...stylex.props(styles.precip)}>
          <Icon icon={Droplet} size={12} />
          {precip}%
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        {...stylex.props(...rootStyles, styles.button, press.scale, xstyle)}
      >
        {content}
      </button>
    );
  }

  return <div {...stylex.props(...rootStyles, xstyle)}>{content}</div>;
}
