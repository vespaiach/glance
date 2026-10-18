"use client";

import { usePhoto, usePhotoSrc, usePhotosRepo } from "@/data/repos";
import type { Photo } from "@/domain/schemas";
import { dateKey } from "@/domain/zone";
import { useKeyboardInset } from "@/shell/keyboard";
import { useNetwork } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useTimeZone } from "@/shell/providers/timeZone";
import { useSheetHost } from "@/shell/SheetHost";
import { PhotoSheet } from "./components/PhotoSheet";
import { draftFromPhoto, initialPhotoSheet } from "./photoSheet";

export function PhotoSheetScreen() {
  const { sheet } = useSheetHost();

  if (sheet?.kind === "photo")
    return <LoadedPhotoSheet key={sheet.id} id={sheet.id} discard={sheet.discard} />;

  return null;
}

function EditPhotoSheet({ photo, discard }: { photo: Photo; discard?: true }) {
  const { close } = useSheetHost();

  const photos = usePhotosRepo();

  const { online } = useNetwork();

  const photoSrc = usePhotoSrc();

  const today = dateKey(useNow("minute"), useTimeZone());

  const onSave = (edited: Photo) => {
    close();
    void photos.update(edited);
  };

  const onDelete = () => {
    close();
    void photos.remove(photo.id);
  };

  return (
    <PhotoSheet
      photo={photo}
      src={photoSrc(photo.id, "display")}
      today={today}
      initial={initialPhotoSheet(draftFromPhoto(photo), { discard })}
      offline={!online}
      keyboardInset={useKeyboardInset()}
      onClose={close}
      onDelete={onDelete}
      onSave={onSave}
    />
  );
}

function LoadedPhotoSheet({ id, discard }: { id: string; discard?: true }) {
  const photo = usePhoto(id);

  return photo ? <EditPhotoSheet photo={photo} discard={discard} /> : null;
}
