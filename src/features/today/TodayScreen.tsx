"use client";

import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  type ShownNote,
  useEventsOnDay,
  useNotes,
  usePhotoSrc,
  usePhotos,
  useWeather,
} from "@/data/repos";
import { pictureOfDay } from "@/domain/pictureOfDay";
import type { AccountSettings, Photo, Weather } from "@/domain/schemas";
import { localDateKey } from "@/domain/time";
import { todayHero } from "@/domain/todayHero";
import { readZoneState, type ZoneState } from "@/domain/zoneState";
import { useBreakpoint } from "@/shell/breakpoint";
import { useNow } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { type View, viewPath } from "@/shell/routes";
import { useSheetHost } from "@/shell/SheetHost";
import { space } from "@/theme/tokens.stylex";
import { HeroSkeleton, HeroSummary } from "./components/HeroSummary";
import { PictureOfDay, PictureOfDayEmpty, PictureOfDaySkeleton } from "./components/PictureOfDay";
import { TodayHero } from "./components/TodayHero";
import { TodayNotes } from "./components/TodayNotes";
import { TodaySchedule } from "./components/TodaySchedule";
import { TodayWeather } from "./components/TodayWeather";
import { todayAreas, todayLayout, todayScheduleFit } from "./layout";

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: space.lg,
  },
});

function weatherZone(
  weather: Weather | null | undefined,
  location: AccountSettings["weatherLocation"],
): ZoneState<Weather> {
  if (location === undefined) return { kind: "empty" };

  return weather ? { kind: "ready", data: [weather] } : { kind: "loading" };
}

function HeroClock({ children }: { children: ReactNode }) {
  const season = useSeason();

  const settings = useAccountSettings();

  const time = useNow("second");

  return (
    <TodayHero season={season} time={time} clock={settings.clock} xstyle={todayAreas.hero}>
      {children}
    </TodayHero>
  );
}

type PictureProps = {
  photos: readonly Photo[] | undefined;
  now: Date;
  canUpload: boolean;
  onUpload: () => void;
};

function Picture({ photos, now, canUpload, onUpload }: PictureProps) {
  const photoSrc = usePhotoSrc();

  if (photos === undefined) return <PictureOfDaySkeleton />;

  const photo = pictureOfDay(photos, now);

  if (photo === undefined) return <PictureOfDayEmpty canUpload={canUpload} onUpload={onUpload} />;

  return <PictureOfDay photo={photo} src={photoSrc(photo.id, "display")} />;
}

export function TodayScreen() {
  const router = useRouter();

  const sheets = useSheetHost();

  const breakpoint = useBreakpoint();

  const settings = useAccountSettings();

  const now = useNow("minute");

  const day = localDateKey(now);

  const events = readZoneState(useEventsOnDay(day));

  const notes: ZoneState<ShownNote> = readZoneState(useNotes(now));

  const photos = usePhotos();

  const weather = weatherZone(useWeather(), settings.weatherLocation);

  const go = (view: View) => router.push(viewPath(view));

  const openEvent = (id: string) => sheets.open({ kind: "event", id });

  return (
    <div {...stylex.props(styles.grid, todayLayout(breakpoint))}>
      <HeroClock>
        {events.kind === "loading" ? (
          <HeroSkeleton />
        ) : (
          <HeroSummary
            hero={todayHero(events.kind === "ready" ? events.data : [], now)}
            clock={settings.clock}
            onOpenEvent={openEvent}
          />
        )}
      </HeroClock>
      <TodaySchedule
        state={events}
        now={now}
        clock={settings.clock}
        compact={breakpoint === "phone"}
        onOpenEvent={openEvent}
        onAddEvent={() => sheets.open({ kind: "newevent", day })}
        onOpenCalendar={() => go("calendar")}
        xstyle={[todayAreas.sched, todayScheduleFit(breakpoint)]}
      >
        {settings.background.mode === "season" && (
          <Picture
            photos={photos}
            now={now}
            canUpload={breakpoint !== "phone"}
            onUpload={() => go("photos")}
          />
        )}
      </TodaySchedule>
      <TodayWeather
        state={weather}
        unit={settings.tempUnit}
        onSetLocation={() => go("weather")}
        xstyle={todayAreas.wx}
      />
      <TodayNotes
        state={notes}
        now={now}
        clock={settings.clock}
        onOpenNote={(id) => sheets.open({ kind: "note", id })}
        onAddNote={() => sheets.open({ kind: "newnote" })}
        onOpenNotes={() => go("notes")}
        xstyle={todayAreas.notes}
      />
    </div>
  );
}
