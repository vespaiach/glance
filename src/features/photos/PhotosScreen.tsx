"use client";

import { useState } from "react";
import { fixtureUploads, usePhotoSrc, usePhotos } from "@/data/repos";
import type { Photo } from "@/domain/schemas";
import { readZoneState, type ZoneState } from "@/domain/zoneState";
import { useBreakpoint } from "@/shell/breakpoint";
import { useFixtureParams } from "@/shell/fixtureOptions";
import { useNetwork } from "@/shell/providers/network";
import { PhotosView } from "./components/PhotosView";
import { newestFirst, wrapIndex } from "./slideshow";
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

  const [index, setIndex] = useState(0);

  const [playing, setPlaying] = useState(true);

  const [uploads] = useState(() => initialUploads(fixture.upload, fixtureUploads));

  const count = state.kind === "ready" ? state.data.length : 0;

  const selected = count > 0 ? wrapIndex(index, count) : 0;

  return (
    <PhotosView
      state={state}
      selected={selected}
      playing={playing}
      uploads={uploads}
      online={online}
      canUpload={breakpoint !== "phone"}
      breakpoint={breakpoint}
      photoSrc={photoSrc}
      onSelect={setIndex}
      onStep={(delta) => setIndex(selected + delta)}
      onTogglePlay={() => setPlaying((value) => !value)}
      onUpload={notYet}
      onRetry={notYet}
      onRemove={notYet}
    />
  );
}
