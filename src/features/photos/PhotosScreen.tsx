"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useReducer, useState } from "react";
import { fixtureUploads, usePhotoSrc, usePhotos, useSettingsRepo } from "@/data/repos";
import { changeBackground } from "@/domain/background";
import type { AccountSettings, Photo } from "@/domain/schemas";
import { dateKey } from "@/domain/zone";
import { useQrTile } from "@/features/settings";
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
import { useDeletePhoto } from "./useDeletePhoto";
import { usePhotoPicker } from "./usePhotoPicker";
import { useUploads } from "./useUploads";

const BACKGROUND_PATH = "/settings/background";

export function PhotosScreen() {
  const router = useRouter();

  const breakpoint = useBreakpoint();

  const photoParam = useSearchParams().get("photo");

  const { online } = useNetwork();

  const fixture = useFixtureParams();

  const photoSrc = usePhotoSrc();

  const { clock: clockFormat, background } = useAccountSettings();

  const repo = useSettingsRepo();

  const photos = usePhotos();

  const zone = useSyncedZone(shownPhotos(photos));

  const state = zone.state;

  const now = useNow();

  const clock = useNowStore();

  const [pinned, dispatch] = useReducer(slideshow, clock, (store) =>
    openSlideshow(store.get(), photoParam, fixture.play !== "0" && !fixture.phdel),
  );

  const [deleting, setDeleting] = useState(fixture.phdel === true);

  const [qrOpen, setQrOpen] = useState(fixture.phqr === true);

  const [full, dispatchFull] = useReducer(fullScreen, fixture, initialFullScreen);

  const uploads = useUploads(() => initialUploads(fixture.upload, fixtureUploads), online);

  const picker = usePhotoPicker(uploads.choose);

  const qr = useQrTile(undefined, "photos");

  const deletePhoto = useDeletePhoto();

  const small = breakpoint === "small";

  const noPhotos = state.kind === "empty" && uploads.tiles.length === 0;

  const qrShown = !small && online && (qrOpen || noPhotos);

  const syncQr = useEffectEvent((shown: boolean) => (shown ? qr.show() : qr.close()));

  useEffect(() => syncQr(qrShown), [qrShown]);

  const tz = useTimeZone();

  const sheets = useSheetHost();

  const ids = state.kind === "ready" ? state.data.map((photo) => photo.id) : [];

  const show = settleSlideshow(pinned, ids);

  const count = ids.length;

  const selected = count > 0 ? wrapIndex(slideIndex(show, now), count) : 0;

  const featured = state.kind === "ready" ? state.data[selected] : undefined;

  const thisYear = Number(dateKey(now, tz).slice(0, 4));

  const pause = () => dispatch({ type: "pause", at: clock.get(), ids });

  const step = (delta: number) => {
    setDeleting(false);

    dispatch({ type: "step", delta, at: clock.get(), ids });
  };

  const select = (index: number) => {
    setDeleting(false);

    dispatch({ type: "select", index, at: clock.get(), ids });
  };

  const togglePlay = () => dispatch({ type: "toggle", at: clock.get(), ids });

  const editPhoto = (id: string) => {
    setDeleting(false);

    pause();

    sheets.open({ kind: "photo", id });
  };

  const askDelete = () => {
    setDeleting(true);

    pause();
  };

  const confirmDelete = (id: string) => {
    setDeleting(false);

    deletePhoto(id);
  };

  const chooseFiles = () => {
    setQrOpen(false);

    picker.open();
  };

  const setBackground = (photoId: string) => {
    repo.update({
      background: changeBackground(
        background,
        photos ?? [],
        { mode: "photo", photoId },
        clock.get(),
        tz,
      ),
    });

    dispatch({ type: "pin", photoId, at: clock.get(), ids });
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
        {...(qrShown && { qr: { url: qrUrl(qr.tile) } })}
        deleting={deleting}
        breakpoint={breakpoint}
        backgroundId={photoBackground(background)}
        photoSrc={photoSrc}
        onSelect={select}
        onEdit={editPhoto}
        onAskDelete={askDelete}
        onCancelDelete={() => setDeleting(false)}
        onDelete={confirmDelete}
        onStep={step}
        onTogglePlay={togglePlay}
        onFullScreen={() => dispatchFull({ type: "open" })}
        onUpload={small ? picker.open : () => setQrOpen(!qrOpen)}
        onChooseFiles={chooseFiles}
        onCloseQr={() => setQrOpen(false)}
        onRetry={uploads.retry}
        onRetryAll={uploads.retryAll}
        onRemove={uploads.remove}
        onClear={uploads.clear}
        onSetBackground={setBackground}
        onOpenBackground={() => router.push(BACKGROUND_PATH)}
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

function photoBackground(background: AccountSettings["background"]): string | undefined {
  return background.mode === "photo" ? background.photoId : undefined;
}

function qrUrl(tile: ReturnType<typeof useQrTile>["tile"]): string | undefined {
  return tile.kind === "open" ? tile.url : undefined;
}
