import * as stylex from "@stylexjs/stylex";
import type { LucideIcon } from "lucide-react";
import type { WeatherIcon } from "@/domain/schemas";
import { space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { ColorBlock } from "./ColorBlock";
import { Eyebrow } from "./Eyebrow";
import { Icon } from "./Icon";
import { weatherIcons } from "./weatherIcons";

export type WeatherNowTone = 1 | 2 | 3 | 4 | "soft" | "deep";

export type WeatherDetail = {
  label: string;
  value: string;
  icon?: LucideIcon;
};

export type WeatherNowLabels = {
  high: string;
  low: string;
  feelsLike: string;
};

type WeatherNowProps = {
  location: string;
  temp: number;
  condition: string;
  icon: WeatherIcon;
  high?: number;
  low?: number;
  feelsLike?: number;
  details?: readonly WeatherDetail[];
  labels: WeatherNowLabels;
  tone?: WeatherNowTone;
  xstyle?: stylex.StyleXStyles;
};

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space.lg,
  },
  reading: {
    display: "flex",
    alignItems: "center",
    gap: space.xl,
  },
  temp: {
    fontSize: type.tempSize,
    fontWeight: type.tempWeight,
    lineHeight: type.tempLh,
    letterSpacing: type.tempLs,
    fontVariantNumeric: "tabular-nums",
  },
  summary: {
    display: "flex",
    flexDirection: "column",
    gap: space.xxs,
  },
  condition: {
    fontSize: 40,
    fontWeight: type.displayLgWeight,
    lineHeight: type.displayLgLh,
    letterSpacing: "-0.6px",
  },
  range: {
    fontSize: type.bodyLgSize,
    fontWeight: 480,
  },
  details: (count: number) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${count}, minmax(0,1fr))`,
    gap: space.md,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "rgba(0,0,0,.12)",
  }),
  detailsOnDeep: { borderTopColor: "rgba(255,255,255,.2)" },
  detail: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
  },
  detailLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  detailValue: {
    fontSize: 28,
    fontWeight: 480,
    letterSpacing: "-0.4px",
  },
});

function rangeText(
  { high, low, feelsLike }: Pick<WeatherNowProps, "high" | "low" | "feelsLike">,
  labels: WeatherNowLabels,
) {
  const parts = [
    high !== undefined && `${labels.high} ${high}°`,
    low !== undefined && `${labels.low} ${low}°`,
    feelsLike !== undefined && `${labels.feelsLike} ${feelsLike}°`,
  ].filter(Boolean);

  return parts.join(" · ");
}

export function WeatherNow({
  location,
  temp,
  condition,
  icon,
  high,
  low,
  feelsLike,
  details = [],
  labels,
  tone = 3,
  xstyle,
}: WeatherNowProps) {
  const range = rangeText({ high, low, feelsLike }, labels);

  return (
    <ColorBlock tone={tone} xstyle={[styles.root, xstyle]}>
      <Eyebrow>{location}</Eyebrow>
      <div {...stylex.props(styles.reading)}>
        <div {...stylex.props(styles.temp)}>{temp}°</div>
        <Icon icon={weatherIcons[icon]} size={112} strokeWidth={1.25} />
      </div>
      <div {...stylex.props(styles.summary)}>
        <div {...stylex.props(styles.condition)}>{condition}</div>
        {range && <div {...stylex.props(styles.range)}>{range}</div>}
      </div>
      {details.length > 0 && (
        <div
          {...stylex.props(styles.details(details.length), tone === "deep" && styles.detailsOnDeep)}
        >
          {details.map((detail) => (
            <div key={detail.label} {...stylex.props(styles.detail)}>
              <Eyebrow size="caption" xstyle={styles.detailLabel}>
                {detail.icon && <Icon icon={detail.icon} size={16} />}
                {detail.label}
              </Eyebrow>
              <div {...stylex.props(styles.detailValue)}>{detail.value}</div>
            </div>
          ))}
        </div>
      )}
    </ColorBlock>
  );
}
