"use client";

import { useRouter } from "next/navigation";
import { useSettingsRepo } from "@/data/repos";
import { useBreakpoint } from "@/shell/breakpoint";
import { useAccountSettings } from "@/shell/providers/settings";
import { useAmbientNavigate } from "@/shell/useAmbientNavigate";
import { AmbientScheduleView } from "./components/AmbientScheduleView";

const SETTINGS_PATH = "/settings";

const AMBIENT_PATH = "/ambient";

export function AmbientScheduleScreen() {
  const router = useRouter();

  const navigate = useAmbientNavigate();

  const breakpoint = useBreakpoint();

  const settings = useAccountSettings();

  const repo = useSettingsRepo();

  return (
    <AmbientScheduleView
      ambient={settings.ambient}
      brightness={settings.ambientBrightness}
      clock={settings.clock}
      idleTimeout={settings.idleTimeout}
      breakpoint={breakpoint}
      onChange={(ambient) => void repo.update({ ambient })}
      onBrightness={(ambientBrightness) => void repo.update({ ambientBrightness })}
      onBack={() => router.push(SETTINGS_PATH)}
      onPreview={() => navigate(AMBIENT_PATH)}
    />
  );
}
