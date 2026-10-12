"use client";

import { useRouter } from "next/navigation";
import { useAccount, usePhotos, useSettingsRepo, useSignOut } from "@/data/repos";
import { shownBackground } from "@/domain/background";
import { useBreakpoint } from "@/shell/breakpoint";
import { useNow } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { SettingsView } from "./components/SettingsView";

const BACKGROUND_PATH = "/settings/background";

const LOCATION_PATH = "/settings/location";

const AMBIENT_PATH = "/settings/ambient";

const SIGN_IN_PATH = "/signin";

export function SettingsScreen() {
  const router = useRouter();

  const breakpoint = useBreakpoint();

  const account = useAccount();

  const settings = useAccountSettings();

  const season = useSeason();

  const photos = usePhotos();

  const now = useNow("minute");

  const tz = useTimeZone();

  const repo = useSettingsRepo();

  const signOut = useSignOut();

  return (
    <SettingsView
      account={account}
      settings={settings}
      season={season}
      background={shownBackground(settings.background, photos ?? [], now, tz)}
      breakpoint={breakpoint}
      onChange={(change) => repo.update(change)}
      onOpenBackground={() => router.push(BACKGROUND_PATH)}
      onOpenLocation={() => router.push(LOCATION_PATH)}
      onOpenAmbient={() => router.push(AMBIENT_PATH)}
      onSignOut={() => void signOut().then(() => router.replace(SIGN_IN_PATH))}
    />
  );
}
