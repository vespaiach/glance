import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import { copy } from "@/copy";
import type { WeatherIcon } from "@/domain/schemas";
import { season } from "@/theme/seasons.stylex";
import { colors, radii } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { weatherIcons } from "@/ui/weatherIcons";

export type PreviewHour = { time: string; icon: WeatherIcon; temp: string; label: string };

export type PreviewTile = {
  icon: WeatherIcon;
  temp: string;
  condition: string;
  hours: readonly PreviewHour[];
};

export type PreviewPlan = { id: string; time: string; title: string; who: string };

type DayPreviewProps = {
  label: string;
  weather?: PreviewTile | "none";
  plans: readonly PreviewPlan[];
};

const words = copy.events.preview;

const styles = stylex.create({
  root: {
    flexBasis: "34%",
    flexShrink: 0,
    minWidth: 380,
    boxSizing: "border-box",
    padding: 32,
    display: "flex",
    flexDirection: "column",
    gap: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
  },
  tile: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: season.block3,
  },
  now: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  reading: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },
  temp: {
    fontSize: 40,
    fontWeight: 300,
    letterSpacing: "-1px",
    lineHeight: 1,
  },
  condition: {
    fontSize: 17,
    fontWeight: 330,
    lineHeight: 1.35,
  },
  strip: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    paddingTop: 16,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(64px, 1fr))",
    gap: 8,
    boxShadow: `inset 0 1px 0 ${colors.white}`,
  },
  hour: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },
  mono: {
    fontFamily: type.fontMono,
    fontSize: type.captionSize,
    letterSpacing: type.captionLs,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  hourTemp: {
    fontSize: 16,
    fontWeight: 400,
  },
  plain: {
    margin: 0,
    fontSize: 17,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  also: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  plans: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  plan: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },
  planText: {
    fontSize: 17,
    lineHeight: 1.35,
    textWrap: "pretty",
  },
  planTitle: {
    fontWeight: 540,
  },
  planWho: {
    fontWeight: 330,
  },
});

export function DayPreview({ label, weather, plans }: DayPreviewProps) {
  const heading = useId();

  return (
    <aside aria-label={label} {...stylex.props(styles.root)}>
      {weather === "none" && <p {...stylex.props(styles.plain)}>{words.noForecast}</p>}
      {weather && weather !== "none" && <WeatherTile {...weather} />}
      <div {...stylex.props(styles.also)}>
        <Eyebrow>
          <span id={heading}>{words.also(plans.length)}</span>
        </Eyebrow>
        {plans.length === 0 ? (
          <p {...stylex.props(styles.plain)}>{words.nothing}</p>
        ) : (
          <ul aria-labelledby={heading} {...stylex.props(styles.plans)}>
            {plans.map((plan) => (
              <PlanRow key={plan.id} {...plan} />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function WeatherTile({ icon, temp, condition, hours }: PreviewTile) {
  return (
    <div {...stylex.props(styles.tile)}>
      <div {...stylex.props(styles.now)}>
        <Icon icon={weatherIcons[icon]} size={40} strokeWidth={1.25} />
        <div {...stylex.props(styles.reading)}>
          <span {...stylex.props(styles.temp)}>{temp}</span>
          <span {...stylex.props(styles.condition)}>{condition}</span>
        </div>
      </div>
      {hours.length > 1 && (
        <ul aria-label={words.hourly} {...stylex.props(styles.strip)}>
          {hours.map((hour) => (
            <li key={hour.time} aria-label={hour.label} {...stylex.props(styles.hour)}>
              <span {...stylex.props(styles.mono)}>{hour.time}</span>
              <Icon icon={weatherIcons[hour.icon]} size={20} strokeWidth={1.5} />
              <span {...stylex.props(styles.hourTemp)}>{hour.temp}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlanRow({ time, title, who }: PreviewPlan) {
  return (
    <li {...stylex.props(styles.plan)}>
      <span {...stylex.props(styles.mono)}>{time}</span>
      <span {...stylex.props(styles.planText)}>
        <span {...stylex.props(styles.planTitle)}>{title}</span>
        {who && <span {...stylex.props(styles.planWho)}> · {who}</span>}
      </span>
    </li>
  );
}
