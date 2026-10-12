"use client";

import { useReducer } from "react";
import { fixtureUploads, usePhotoSrc, usePhotos } from "@/data/repos";
import type { Photo } from "@/domain/schemas";
import { useBreakpoint } from "@/shell/breakpoint";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useNetwork } from "@/shell/providers/network";
import { useNow, useNowStore } from "@/shell/providers/now";
import { useAccountSettings } from "@/shell/providers/settings";
import { useSyncedZone } from "@/shell/sourceZone";
import { PhotosView } from "./components/PhotosView";
import { newestFirst, slideIndex, slideshow, startSlideshow, wrapIndex } from "./slideshow";
import { initialUploads } from "./uploads";
import { usePhotoPicker } from "./usePhotoPicker";
import { useUploads } from "./useUploads";

function shownPhotos(photos: readonly Photo[] | undefined): readonly Photo[] | undefined {
  return photos && newestFirst(photos);
}

export function PhotosScreen() {
  const breakpoint = useBreakpoint();

  const { online } = useNetwork();

  const fixture = useFixtureParams();

  const photoSrc = usePhotoSrc();

  const { clock: clockFormat } = useAccountSettings();

  const zone = useSyncedZone(shownPhotos(usePhotos()));

  const state = zone.state;

  const now = useNow();

  const clock = useNowStore();

  const [show, dispatch] = useReducer(slideshow, clock, (store) => startSlideshow(store.get()));

  const uploads = useUploads(() => initialUploads(fixture.upload, fixtureUploads));

  const picker = usePhotoPicker(uploads.choose);

  const count = state.kind === "ready" ? state.data.length : 0;

  const selected = count > 0 ? wrapIndex(slideIndex(show, now), count) : 0;

  return (
    <>
      {picker.input}
      <PhotosView
        state={state}
        retryIn={zone.retryIn}
        onRetrySync={zone.retry}
        clock={clockFormat}
        selected={selected}
        playing={show.kind === "playing"}
        uploads={uploads.tiles}
        online={online}
        canUpload={breakpoint !== "phone"}
        breakpoint={breakpoint}
        photoSrc={photoSrc}
        onSelect={(index) => dispatch({ type: "select", index, at: clock.get() })}
        onStep={(delta) => dispatch({ type: "step", delta, at: clock.get() })}
        onTogglePlay={() => dispatch({ type: "toggle", at: clock.get() })}
        onUpload={picker.open}
        onRetry={uploads.retry}
        onRemove={uploads.remove}
      />
    </>
  );
}
