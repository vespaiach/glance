"use client";

import { useRouter } from "next/navigation";
import { fixtureUploads, usePhotoSrc, usePhotos, useSettingsRepo } from "@/data/repos";
import { changeBackground } from "@/domain/background";
import type { AccountSettings, Photo } from "@/domain/schemas";
import { initialUploads, newestFirst, usePhotoPicker, useUploads } from "@/features/photos";
import { useBreakpoint } from "@/shell/breakpoint";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useNetwork } from "@/shell/providers/network";
import { useNow, useNowStore } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { useSyncedZone } from "@/shell/sourceZone";
import { BackgroundView } from "./components/BackgroundView";

const SETTINGS_PATH = "/settings";

export function BackgroundScreen() {
  const router = useRouter();

  const breakpoint = useBreakpoint();

  const { online } = useNetwork();

  const fixture = useFixtureParams();

  const photoSrc = usePhotoSrc();

  const photos = usePhotos();

  const zone = useSyncedZone(shownPhotos(photos));

  const now = useNow("minute");

  const tz = useTimeZone();

  const clock = useNowStore();

  const { background } = useAccountSettings();

  const repo = useSettingsRepo();

  const uploads = useUploads(() => initialUploads(fixture.upload, fixtureUploads), online);

  const picker = usePhotoPicker(uploads.choose);

  const change = (next: Partial<AccountSettings["background"]>) =>
    repo.update({ background: changeBackground(background, photos ?? [], next, clock.get(), tz) });

  return (
    <>
      {picker.input}
      <BackgroundView
        state={zone.state}
        retryIn={zone.retryIn}
        onRetrySync={zone.retry}
        background={background}
        now={now}
        tz={tz}
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

function shownPhotos(photos: readonly Photo[] | undefined): readonly Photo[] | undefined {
  return photos && newestFirst(photos);
}
