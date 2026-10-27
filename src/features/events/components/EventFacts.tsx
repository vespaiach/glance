import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import { copy } from "@/copy";
import type { Breakpoint } from "@/domain/breakpoint";
import { colors, radii } from "@/theme/tokens.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { PlanRow, type PreviewPlan, type PreviewTile, WeatherTile } from "./DayPreview";

type EventFactsProps = {
  breakpoint: Breakpoint;
  day: string;
  scope: "time" | "day";
  weather?: PreviewTile | "none";
  plans: readonly PreviewPlan[];
};

const words = copy.events.preview;

const styles = stylex.create({
  card: {
    flexGrow: 1,
    flexShrink: 0,
    boxSizing: "border-box",
    display: "grid",
    alignItems: "start",
    alignContent: "start",
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCanvas,
    color: colors.textPrimary,
  },
  forecast: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minWidth: 0,
  },
  also: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    minWidth: 0,
  },
  plans: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  plain: {
    margin: 0,
    fontSize: 18,
    fontWeight: 330,
    lineHeight: 1.45,
  },
});

const sizes = stylex.create({
  large: {
    gridTemplateColumns: "420px minmax(0, 1fr)",
    gap: 64,
    paddingTop: 28,
    paddingInline: 48,
    paddingBottom: 36,
  },
  normal: {
    gridTemplateColumns: "320px minmax(0, 1fr)",
    gap: 48,
    paddingTop: 24,
    paddingInline: 32,
    paddingBottom: 32,
  },
  small: { gridTemplateColumns: "minmax(0, 1fr)", gap: 28, padding: 20 },
});

export function EventFacts({ breakpoint, day, scope, weather, plans }: EventFactsProps) {
  const heading = useId();

  const byDay = scope === "day";

  return (
    <section aria-label={words.facts} {...stylex.props(styles.card, sizes[breakpoint])}>
      <div {...stylex.props(styles.forecast)}>
        <Eyebrow>{words.forecast(day)}</Eyebrow>
        {weather === "none" && <p {...stylex.props(styles.plain)}>{words.noForecast}</p>}
        {weather && weather !== "none" && <WeatherTile {...weather} />}
      </div>
      <div {...stylex.props(styles.also)}>
        <Eyebrow>
          <span id={heading}>{byDay ? words.alsoDay(plans.length) : words.also(plans.length)}</span>
        </Eyebrow>
        {plans.length === 0 ? (
          <p {...stylex.props(styles.plain)}>{byDay ? words.nothingDay : words.nothing}</p>
        ) : (
          <ul aria-labelledby={heading} {...stylex.props(styles.plans)}>
            {plans.map((plan) => (
              <PlanRow key={plan.id} {...plan} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
