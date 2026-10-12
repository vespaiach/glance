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
import type { AccountSettings, CalendarEvent, Photo } from "@/domain/schemas";
import { localDateKey } from "@/domain/time";
import { todayHero } from "@/domain/todayHero";
import type { ZoneState } from "@/domain/zoneState";
import { useBreakpoint } from "@/shell/breakpoint";
import { useNow } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { type View, viewPath } from "@/shell/routes";
import { useSheetHost } from "@/shell/SheetHost";
import { useSyncedZone, useWeatherZone } from "@/shell/sourceZone";
import { space } from "@/theme/tokens.stylex";
import { Zone } from "@/ui/Zone";
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

type HeroProps = {
  state: ZoneState<CalendarEvent>;
  clock: AccountSettings["clock"];
  now: Date;
  onOpenEvent: (id: string) => void;
};

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
  state: ZoneState<Photo>;
  now: Date;
  canUpload: boolean;
  onUpload: () => void;
};

function Picture({ state, now, canUpload, onUpload }: PictureProps) {
  const photoSrc = usePhotoSrc();

  const empty = <PictureOfDayEmpty canUpload={canUpload} onUpload={onUpload} />;

  return (
    <Zone state={state} loading={<PictureOfDaySkeleton />} empty={empty} failed={null}>
      {(photos) => {
        const photo = pictureOfDay(photos, now);

        return photo ? <PictureOfDay photo={photo} src={photoSrc(photo.id, "display")} /> : empty;
      }}
    </Zone>
  );
}

function Hero({ state, clock, now, onOpenEvent }: HeroProps) {
  if (state.kind === "loading") return <HeroSkeleton />;

  if (state.kind === "failed") return null;

  return (
    <HeroSummary
      hero={todayHero(state.kind === "ready" ? state.data : [], now)}
      clock={clock}
      onOpenEvent={onOpenEvent}
    />
  );
}

export function TodayScreen() {
  const router = useRouter();

  const sheets = useSheetHost();

  const breakpoint = useBreakpoint();

  const settings = useAccountSettings();

  const now = useNow("minute");

  const day = localDateKey(now);

  const events = useSyncedZone(useEventsOnDay(day));

  const notes = useSyncedZone<ShownNote>(useNotes(now));

  const photos = useSyncedZone(usePhotos());

  const weather = useWeatherZone(useWeather(), settings.weatherLocation !== undefined);

  const go = (view: View) => router.push(viewPath(view));

  const openEvent = (id: string) => sheets.open({ kind: "event", id });

  return (
    <div {...stylex.props(styles.grid, todayLayout(breakpoint))}>
      <HeroClock>
        <Hero state={events.state} clock={settings.clock} now={now} onOpenEvent={openEvent} />
      </HeroClock>
      <TodaySchedule
        state={events.state}
        retryIn={events.retryIn}
        onRetry={events.retry}
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
            state={photos.state}
            now={now}
            canUpload={breakpoint !== "phone"}
            onUpload={() => go("photos")}
          />
        )}
      </TodaySchedule>
      <TodayWeather
        state={weather.state}
        retryIn={weather.retryIn}
        onRetry={weather.retry}
        unit={settings.tempUnit}
        clock={settings.clock}
        onSetLocation={() => go("weather")}
        xstyle={todayAreas.wx}
      />
      <TodayNotes
        state={notes.state}
        retryIn={notes.retryIn}
        onRetry={notes.retry}
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
