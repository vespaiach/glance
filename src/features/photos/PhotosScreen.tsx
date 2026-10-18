"use client";

import { useSearchParams } from "next/navigation";
import { useReducer } from "react";
import { fixtureUploads, usePhotoSrc, usePhotos } from "@/data/repos";
import type { Photo } from "@/domain/schemas";
import { dateKey } from "@/domain/zone";
import { useBreakpoint } from "@/shell/breakpoint";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useNetwork } from "@/shell/providers/network";
import { useNow, useNowStore } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { useSheetHost } from "@/shell/SheetHost";
import { useSyncedZone } from "@/shell/sourceZone";
import { FullScreenPhoto } from "./components/FullScreenPhoto";
import { PhotosView } from "./components/PhotosView";
import { fullScreen, initialFullScreen } from "./fullScreen";
import {
  newestFirst,
  openSlideshow,
  settleSlideshow,
  slideIndex,
  slideshow,
  wrapIndex,
} from "./slideshow";
import { initialUploads } from "./uploads";
import { usePhotoPicker } from "./usePhotoPicker";
import { useUploads } from "./useUploads";

export function PhotosScreen() {
  const breakpoint = useBreakpoint();

  const photoParam = useSearchParams().get("photo");

  const { online } = useNetwork();

  const fixture = useFixtureParams();

  const photoSrc = usePhotoSrc();

  const { clock: clockFormat } = useAccountSettings();

  const zone = useSyncedZone(shownPhotos(usePhotos()));

  const state = zone.state;

  const now = useNow();

  const clock = useNowStore();

  const [pinned, dispatch] = useReducer(slideshow, clock, (store) =>
    openSlideshow(store.get(), photoParam),
  );

  const [full, dispatchFull] = useReducer(fullScreen, fixture, initialFullScreen);

  const uploads = useUploads(() => initialUploads(fixture.upload, fixtureUploads), online);

  const picker = usePhotoPicker(uploads.choose);

  const tz = useTimeZone();

  const sheets = useSheetHost();

  const ids = state.kind === "ready" ? state.data.map((photo) => photo.id) : [];

  const show = settleSlideshow(pinned, ids);

  const count = ids.length;

  const selected = count > 0 ? wrapIndex(slideIndex(show, now), count) : 0;

  const featured = state.kind === "ready" ? state.data[selected] : undefined;

  const thisYear = Number(dateKey(now, tz).slice(0, 4));

  const step = (delta: number) => dispatch({ type: "step", delta, at: clock.get(), ids });

  const togglePlay = () => dispatch({ type: "toggle", at: clock.get(), ids });

  const editPhoto = (id: string) => {
    dispatch({ type: "pause", at: clock.get(), ids });

    sheets.open({ kind: "photo", id });
  };

  return (
    <>
      {picker.input}
      <PhotosView
        state={state}
        retryIn={zone.retryIn}
        onRetrySync={zone.retry}
        clock={clockFormat}
        tz={tz}
        thisYear={thisYear}
        selected={selected}
        playing={show.kind === "playing"}
        uploads={uploads.tiles}
        online={online}
        canUpload={breakpoint !== "phone"}
        breakpoint={breakpoint}
        photoSrc={photoSrc}
        onSelect={(index) => dispatch({ type: "select", index, at: clock.get(), ids })}
        onEdit={editPhoto}
        onStep={step}
        onTogglePlay={togglePlay}
        onFullScreen={() => dispatchFull({ type: "open" })}
        onUpload={picker.open}
        onRetry={uploads.retry}
        onRemove={uploads.remove}
      />
      {full.kind === "open" && featured && (
        <FullScreenPhoto
          photo={featured}
          src={photoSrc(featured.id, "display")}
          index={selected}
          total={count}
          thisYear={thisYear}
          playing={show.kind === "playing"}
          chrome={full.chrome}
          onExit={() => dispatchFull({ type: "exit" })}
          onToggleChrome={() => dispatchFull({ type: "toggleChrome" })}
          onStep={step}
          onTogglePlay={togglePlay}
        />
      )}
    </>
  );
}

function shownPhotos(photos: readonly Photo[] | undefined): readonly Photo[] | undefined {
  return photos && newestFirst(photos);
}
