"use client";

import * as stylex from "@stylexjs/stylex";
import { ArrowRight, ChevronRight, CloudSun, Search } from "lucide-react";
import type { FormEvent } from "react";
import { copy } from "@/copy";
import type { WeatherLocation } from "@/domain/schemas";
import { colors, radii, space } from "@/theme/tokens.stylex";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { press } from "@/ui/press";
import { TextInput } from "@/ui/TextInput";
import type { WeatherSetupState } from "../weatherSetup";
import { WeatherBlock } from "./WeatherBlock";

const pulse = stylex.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0.6 },
});

const styles = stylex.create({
  heading: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  title: {
    fontSize: type.displayXlSize,
    fontWeight: type.displayXlWeight,
    letterSpacing: type.displayXlLs,
    lineHeight: 1.05,
  },
  body: {
    fontSize: 18,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  form: {
    backgroundColor: colors.surfaceCanvas,
    borderRadius: radii.md,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: space.md,
  },
  searching: {
    display: "flex",
    alignItems: "center",
    gap: space.sm,
    minHeight: 44,
    fontSize: 17,
    fontWeight: 330,
  },
  pulse: {
    display: "flex",
    animationName: pulse,
    animationDuration: "1.2s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationDirection: "alternate",
  },
  matches: {
    display: "flex",
    flexDirection: "column",
    gap: space.xs,
  },
  match: {
    minHeight: 64,
    width: "100%",
    borderWidth: 0,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    paddingBlock: space.sm,
    paddingInline: space.md,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    font: "inherit",
    color: "inherit",
    textAlign: "left",
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: "120ms",
    transitionTimingFunction: "ease-out",
  },
  place: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  city: {
    fontSize: 20,
    fontWeight: 540,
    letterSpacing: "-0.2px",
  },
  region: {
    fontSize: 15,
    fontWeight: 330,
  },
  actions: { display: "flex" },
});

type MatchesProps = {
  matches: readonly WeatherLocation[];
  onPick: (place: WeatherLocation) => void;
};

function Matches({ matches, onPick }: MatchesProps) {
  const city = matches[0]?.name ?? "";

  return (
    <div {...stylex.props(styles.matches)}>
      <Eyebrow>{copy.weather.setup.matches(matches.length, city)}</Eyebrow>
      {matches.map((place) => (
        <button
          key={`${place.lat},${place.lon}`}
          type="button"
          onClick={() => onPick(place)}
          {...stylex.props(styles.match, press.scale)}
        >
          <span {...stylex.props(styles.place)}>
            <span {...stylex.props(styles.city)}>{place.name}</span>
            <span {...stylex.props(styles.region)}>{copy.weather.setup.region(place.region)}</span>
          </span>
          <Icon icon={ChevronRight} size={22} />
        </button>
      ))}
    </div>
  );
}

function Searching({ query }: { query: string }) {
  return (
    <div role="status" {...stylex.props(styles.searching)}>
      <span {...stylex.props(styles.pulse)}>
        <Icon icon={Search} size={22} />
      </span>
      <span>{copy.weather.setup.searching(query)}</span>
    </div>
  );
}

type WeatherSetupProps = {
  state: WeatherSetupState;
  onType: (draft: string) => void;
  onSubmit: () => void;
  onPick: (place: WeatherLocation) => void;
};

export function WeatherSetup({ state, onType, onSubmit, onPick }: WeatherSetupProps) {
  const error = state.step === "editing" && state.error && copy.weather.setup.error[state.error];

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (state.step === "editing") onSubmit();
  };

  return (
    <WeatherBlock>
      <Icon icon={CloudSun} size={64} strokeWidth={1.25} />
      <div {...stylex.props(styles.heading)}>
        <Eyebrow>{copy.weather.setup.eyebrow}</Eyebrow>
        <div {...stylex.props(styles.title)}>{copy.weather.setup.title}</div>
        <span {...stylex.props(styles.body)}>{copy.weather.setup.body}</span>
      </div>
      <form noValidate onSubmit={submit} {...stylex.props(styles.form)}>
        <TextInput
          label={copy.weather.setup.label}
          placeholder={copy.weather.setup.placeholder}
          value={state.draft}
          onChange={onType}
          error={error || undefined}
        />
        {state.step === "searching" && <Searching query={state.query} />}
        {state.step === "choosing" && <Matches matches={state.matches} onPick={onPick} />}
        {state.step === "editing" && (
          <div {...stylex.props(styles.actions)}>
            <Button type="submit" iconRight={ArrowRight}>
              {copy.weather.setup.submit}
            </Button>
          </div>
        )}
      </form>
    </WeatherBlock>
  );
}
