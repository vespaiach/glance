"use client";

import { useRouter } from "next/navigation";
import { fixtureUploads, usePhotoSrc, usePhotos, useSettingsRepo } from "@/data/repos";
import { changeBackground } from "@/domain/background";
import type { AccountSettings, Photo } from "@/domain/schemas";
import { readZoneState, type ZoneState } from "@/domain/zoneState";
import { initialUploads, newestFirst, usePhotoPicker, useUploads } from "@/features/photos";
import { useBreakpoint } from "@/shell/breakpoint";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useNetwork } from "@/shell/providers/network";
import { useNow, useNowStore } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { BackgroundView } from "./components/BackgroundView";

const SETTINGS_PATH = "/settings";

function shownPhotos(photos: readonly Photo[] | undefined): ZoneState<Photo> {
  return readZoneState(photos && newestFirst(photos));
}

export function BackgroundScreen() {
  const router = useRouter();

  const breakpoint = useBreakpoint();

  const { online } = useNetwork();

  const fixture = useFixtureParams();

  const photoSrc = usePhotoSrc();

  const photos = usePhotos();

  const state = shownPhotos(photos);

  const now = useNow("minute");

  const clock = useNowStore();

  const { background } = useAccountSettings();

  const repo = useSettingsRepo();

  const uploads = useUploads(() => initialUploads(fixture.upload, fixtureUploads));

  const picker = usePhotoPicker(uploads.choose);

  const change = (next: Partial<AccountSettings["background"]>) =>
    repo.update({ background: changeBackground(background, photos ?? [], next, clock.get()) });

  return (
    <>
      {picker.input}
      <BackgroundView
        state={state}
        background={background}
        now={now}
        uploads={uploads.tiles}
        online={online}
        canUpload={breakpoint !== "phone"}
        breakpoint={breakpoint}
        photoSrc={photoSrc}
        onChange={change}
        onBack={() => router.push(SETTINGS_PATH)}
        onUpload={picker.open}
        onRetry={uploads.retry}
        onRemove={uploads.remove}
      />
    </>
  );
}
