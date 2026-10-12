"use client";

import { useReducer, useState } from "react";
import { fixtureUploads, usePhotoSrc, usePhotos } from "@/data/repos";
import type { Photo } from "@/domain/schemas";
import { readZoneState, type ZoneState } from "@/domain/zoneState";
import { useBreakpoint } from "@/shell/breakpoint";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useNetwork } from "@/shell/providers/network";
import { useNow, useNowStore } from "@/shell/providers/now";
import { PhotosView } from "./components/PhotosView";
import { newestFirst, slideIndex, slideshow, startSlideshow, wrapIndex } from "./slideshow";
import { initialUploads } from "./uploads";

const notYet = () => {};

function shownPhotos(photos: readonly Photo[] | undefined): ZoneState<Photo> {
  return readZoneState(photos && newestFirst(photos));
}

export function PhotosScreen() {
  const breakpoint = useBreakpoint();

  const { online } = useNetwork();

  const fixture = useFixtureParams();

  const photoSrc = usePhotoSrc();

  const state = shownPhotos(usePhotos());

  const now = useNow();

  const clock = useNowStore();

  const [show, dispatch] = useReducer(slideshow, clock, (store) => startSlideshow(store.get()));

  const [uploads] = useState(() => initialUploads(fixture.upload, fixtureUploads));

  const count = state.kind === "ready" ? state.data.length : 0;

  const selected = count > 0 ? wrapIndex(slideIndex(show, now), count) : 0;

  return (
    <PhotosView
      state={state}
      selected={selected}
      playing={show.kind === "playing"}
      uploads={uploads}
      online={online}
      canUpload={breakpoint !== "phone"}
      breakpoint={breakpoint}
      photoSrc={photoSrc}
      onSelect={(index) => dispatch({ type: "select", index, at: clock.get() })}
      onStep={(delta) => dispatch({ type: "step", delta, at: clock.get() })}
      onTogglePlay={() => dispatch({ type: "toggle", at: clock.get() })}
      onUpload={notYet}
      onRetry={notYet}
      onRemove={notYet}
    />
  );
}
