import * as stylex from "@stylexjs/stylex";
import {
  WeatherFailure,
  WeatherForecast,
  WeatherSetup,
  type WeatherSetupState,
  WeatherSkeleton,
} from "@/features/weather";
import { GalleryGroup } from "./GalleryGroup";
import { DRY_WEATHER, FULL_WEATHER, gallery, NOW, PLACES } from "./samples";

const SETUPS: readonly WeatherSetupState[] = [
  { step: "editing", draft: "" },
  { step: "editing", draft: "", error: "empty" },
  { step: "searching", draft: "Portland", query: "Portland" },
  { step: "editing", draft: "Pordland", error: "unknown" },
  { step: "choosing", draft: "Portland", matches: PLACES },
];

const styles = stylex.create({
  view: {
    width: 1200,
  },
  phone: {
    width: 350,
  },
  setup: {
    width: 680,
  },
});

const forecast = {
  unit: "F",
  clock: "12h",
  today: NOW,
  offline: false,
  breakpoint: "wide",
} as const;

export function WeatherGallery() {
  return (
    <GalleryGroup title={gallery.groups.weatherView}>
      <div {...stylex.props(styles.view)}>
        <WeatherForecast weather={FULL_WEATHER} {...forecast} />
      </div>
      <div {...stylex.props(styles.view)}>
        <WeatherForecast weather={DRY_WEATHER} {...forecast} clock="24h" unit="C" />
      </div>
      <div {...stylex.props(styles.view)}>
        <WeatherForecast weather={FULL_WEATHER} {...forecast} offline />
      </div>
      <div {...stylex.props(styles.phone)}>
        <WeatherForecast weather={FULL_WEATHER} {...forecast} breakpoint="phone" />
      </div>
      <div {...stylex.props(styles.view)}>
        <WeatherSkeleton breakpoint="wide" />
      </div>
      {SETUPS.map((setup) => (
        <div
          key={`${setup.step}-${setup.draft}-${"error" in setup ? setup.error : ""}`}
          {...stylex.props(styles.setup)}
        >
          <WeatherSetup initial={setup} />
        </div>
      ))}
      <div {...stylex.props(styles.setup)}>
        <WeatherFailure location="Portland, Oregon" minutes={1} onRetry={() => {}} />
      </div>
    </GalleryGroup>
  );
}
