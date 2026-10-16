"use client";

import * as stylex from "@stylexjs/stylex";
import { CloudSun } from "lucide-react";
import { copy } from "@/copy";
import { type } from "@/theme/type.stylex";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { PlaceForm, type PlaceFormProps } from "./PlaceForm";
import { WeatherBlock } from "./WeatherBlock";

const styles = stylex.create({
  heading: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
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
});

type WeatherSetupProps = Omit<PlaceFormProps, "submitLabel" | "xstyle">;

export function WeatherSetup(props: WeatherSetupProps) {
  return (
    <WeatherBlock>
      <Icon icon={CloudSun} size={64} strokeWidth={1.25} />
      <div {...stylex.props(styles.heading)}>
        <Eyebrow>{copy.weather.setup.eyebrow}</Eyebrow>
        <div {...stylex.props(styles.title)}>{copy.weather.setup.title}</div>
        <span {...stylex.props(styles.body)}>{copy.weather.setup.body}</span>
      </div>
      <PlaceForm {...props} submitLabel={copy.weather.setup.submit} />
    </WeatherBlock>
  );
}
