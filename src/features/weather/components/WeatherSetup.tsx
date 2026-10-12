"use client";

import * as stylex from "@stylexjs/stylex";
import {
  ArrowRight,
  ChevronRight,
  CloudSun,
  Globe,
  LocateFixed,
  LocateOff,
  type LucideIcon,
  MapPinOff,
  Search,
  SearchX,
} from "lucide-react";
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
import type { LocateFailure, WeatherSetupState } from "../weatherSetup";
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
  locating: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  hint: {
    fontSize: 15,
  },
  notice: {
    display: "flex",
    alignItems: "flex-start",
    gap: space.sm,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    paddingBlock: 14,
    paddingInline: space.md,
    fontSize: 16,
    fontWeight: 330,
    lineHeight: 1.45,
    textWrap: "pretty",
  },
  noticeIcon: {
    display: "flex",
    flex: "none",
  },
  noticeText: {
    minWidth: 0,
  },
  pulse: {
    display: "flex",
    flex: "none",
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
  actions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.sm,
  },
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

function Locating() {
  return (
    <div role="status" {...stylex.props(styles.searching)}>
      <span {...stylex.props(styles.pulse)}>
        <Icon icon={LocateFixed} size={22} />
      </span>
      <span {...stylex.props(styles.locating)}>
        <span>{copy.weather.setup.locating}</span>
        <span {...stylex.props(styles.hint)}>{copy.weather.setup.locatingHint}</span>
      </span>
    </div>
  );
}

const NOTICE_ICONS: Record<LocateFailure, LucideIcon> = {
  denied: MapPinOff,
  "no-position": LocateOff,
  outside: Globe,
  lookup: SearchX,
};

function Notice({ notice }: { notice: LocateFailure }) {
  return (
    <div role="status" {...stylex.props(styles.notice)}>
      <span {...stylex.props(styles.noticeIcon)}>
        <Icon icon={NOTICE_ICONS[notice]} size={22} />
      </span>
      <span {...stylex.props(styles.noticeText)}>{copy.weather.setup.notice[notice]}</span>
    </div>
  );
}

type WeatherSetupProps = {
  state: WeatherSetupState;
  canLocate: boolean;
  onType: (draft: string) => void;
  onSubmit: () => void;
  onPick: (place: WeatherLocation) => void;
  onLocate: () => void;
};

export function WeatherSetup({
  state,
  canLocate,
  onType,
  onSubmit,
  onPick,
  onLocate,
}: WeatherSetupProps) {
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
        {state.step === "locating" && <Locating />}
        {state.step === "editing" && state.notice && <Notice notice={state.notice} />}
        {state.step === "choosing" && <Matches matches={state.matches} onPick={onPick} />}
        {state.step === "editing" && (
          <div {...stylex.props(styles.actions)}>
            <Button type="submit" iconRight={ArrowRight}>
              {copy.weather.setup.submit}
            </Button>
            {canLocate && (
              <Button type="button" variant="secondary" icon={LocateFixed} onClick={onLocate}>
                {copy.weather.setup.locate}
              </Button>
            )}
          </div>
        )}
      </form>
    </WeatherBlock>
  );
}
