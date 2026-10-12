"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fixtureUploads, usePhotoSrc, usePhotos, useSettingsRepo } from "@/data/repos";
import type { AccountSettings, Photo } from "@/domain/schemas";
import { readZoneState, type ZoneState } from "@/domain/zoneState";
import { initialUploads, newestFirst } from "@/features/photos";
import { useBreakpoint } from "@/shell/breakpoint";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useNetwork } from "@/shell/providers/network";
import { useAccountSettings } from "@/shell/providers/settings";
import { BackgroundView } from "./components/BackgroundView";

const SETTINGS_PATH = "/settings";

const notYet = () => {};

function shownPhotos(photos: readonly Photo[] | undefined): ZoneState<Photo> {
  return readZoneState(photos && newestFirst(photos));
}

export function BackgroundScreen() {
  const router = useRouter();

  const breakpoint = useBreakpoint();

  const { online } = useNetwork();

  const fixture = useFixtureParams();

  const photoSrc = usePhotoSrc();

  const state = shownPhotos(usePhotos());

  const { background } = useAccountSettings();

  const repo = useSettingsRepo();

  const [uploads] = useState(() => initialUploads(fixture.upload, fixtureUploads));

  const change = (next: Partial<AccountSettings["background"]>) =>
    repo.update({ background: { ...background, ...next } });

  return (
    <BackgroundView
      state={state}
      background={background}
      uploads={uploads}
      online={online}
      canUpload={breakpoint !== "phone"}
      breakpoint={breakpoint}
      photoSrc={photoSrc}
      onChange={change}
      onBack={() => router.push(SETTINGS_PATH)}
      onUpload={notYet}
      onRetry={notYet}
      onRemove={notYet}
    />
  );
}
