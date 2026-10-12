"use client";

import { useRouter } from "next/navigation";
import { useSettingsRepo } from "@/data/repos";
import { useBreakpoint } from "@/shell/breakpoint";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useAccountSettings } from "@/shell/providers/settings";
import { AmbientScheduleView } from "./components/AmbientScheduleView";

const SETTINGS_PATH = "/settings";

const AMBIENT_PATH = "/ambient";

export function AmbientScheduleScreen() {
  const router = useRouter();

  const breakpoint = useBreakpoint();

  const settings = useAccountSettings();

  const repo = useSettingsRepo();

  const { pick } = useFixtureParams();

  return (
    <AmbientScheduleView
      ambient={settings.ambient}
      clock={settings.clock}
      idleTimeout={settings.idleTimeout}
      breakpoint={breakpoint}
      initialPick={pick}
      onChange={(ambient) => void repo.update({ ambient })}
      onBack={() => router.push(SETTINGS_PATH)}
      onPreview={() => router.push(AMBIENT_PATH)}
    />
  );
}
