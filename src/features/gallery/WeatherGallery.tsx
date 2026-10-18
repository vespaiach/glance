import * as stylex from "@stylexjs/stylex";
import {
  WeatherFailure,
  WeatherForecast,
  WeatherSetup,
  type WeatherSetupState,
  WeatherSkeleton,
} from "@/features/weather";
import { GalleryGroup } from "./GalleryGroup";
import { DRY_WEATHER, FULL_WEATHER, GALLERY_TZ, gallery, NOW, PLACES } from "./samples";

const noop = () => {};

const SETUPS: readonly WeatherSetupState[] = [
  { step: "editing", draft: "" },
  { step: "locating", draft: "" },
  { step: "editing", draft: "", notice: "denied" },
  { step: "editing", draft: "", notice: "no-position" },
  { step: "editing", draft: "", notice: "outside" },
  { step: "editing", draft: "", notice: "lookup" },
  { step: "editing", draft: "Portland, OR", error: "save-failed", place: PLACES[0] },
  { step: "editing", draft: "", error: "empty" },
  { step: "searching", draft: "Portland", query: "Portland" },
  { step: "editing", draft: "Pordland", error: "unknown" },
  { step: "editing", draft: "Portland", error: "unavailable" },
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
  stale: false,
  breakpoint: "wide",
} as const;

export function WeatherGallery() {
  return (
    <GalleryGroup title={gallery.groups.weatherView}>
      <div {...stylex.props(styles.view)}>
        <WeatherForecast tz={GALLERY_TZ} weather={FULL_WEATHER} {...forecast} />
      </div>
      <div {...stylex.props(styles.view)}>
        <WeatherForecast tz={GALLERY_TZ} weather={DRY_WEATHER} {...forecast} clock="24h" unit="C" />
      </div>
      <div {...stylex.props(styles.view)}>
        <WeatherForecast tz={GALLERY_TZ} weather={FULL_WEATHER} {...forecast} stale />
      </div>
      <div {...stylex.props(styles.phone)}>
        <WeatherForecast tz={GALLERY_TZ} weather={FULL_WEATHER} {...forecast} breakpoint="phone" />
      </div>
      <div {...stylex.props(styles.view)}>
        <WeatherSkeleton breakpoint="wide" />
      </div>
      {SETUPS.map((setup) => (
        <div key={setupKey(setup)} {...stylex.props(styles.setup)}>
          <WeatherSetup
            state={setup}
            canLocate={!("notice" in setup && setup.notice === "denied")}
            onType={noop}
            onSubmit={noop}
            onPick={noop}
            onLocate={noop}
          />
        </div>
      ))}
      <div {...stylex.props(styles.setup)}>
        <WeatherFailure location="Portland, Oregon" minutes={1} onRetry={() => {}} />
      </div>
    </GalleryGroup>
  );
}

function setupKey(setup: WeatherSetupState): string {
  const error = "error" in setup ? setup.error : "";

  const notice = "notice" in setup ? setup.notice : "";

  return `${setup.step}-${setup.draft}-${error}-${notice}`;
}
