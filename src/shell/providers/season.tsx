"use client";

import * as stylex from "@stylexjs/stylex";
import { createContext, type ReactNode, useContext } from "react";
import type { Season } from "@/domain/schemas";
import { seasonFor } from "@/domain/season";
import { fall, summer, winter } from "@/theme/themes";
import { useNow } from "./now";
import { useAccountSettings } from "./settings";
import { useTimeZone } from "./timeZone";

const THEMES = { spring: null, summer, fall, winter } satisfies Record<Season, unknown>;

const styles = stylex.create({
  root: {
    display: "contents",
  },
});

const SeasonContext = createContext<Season | undefined>(undefined);

export function SeasonProvider({ children }: { children: ReactNode }) {
  const settings = useAccountSettings();

  const today = useNow("day");

  const tz = useTimeZone();

  const season = seasonFor(settings.season, today, tz);

  return (
    <SeasonContext value={season}>
      <div data-season={season} {...stylex.props(styles.root, THEMES[season])}>
        {children}
      </div>
    </SeasonContext>
  );
}

export function useSeason(): Season {
  const season = useContext(SeasonContext);

  if (season === undefined) throw new Error("useSeason needs a SeasonProvider");

  return season;
}
