import { usePhotoSrc, usePhotos } from "@/data/repos";
import { shownBackground } from "@/domain/background";
import { useAccountSettings } from "./providers/settings";

export type BackgroundPhoto = { src: string; dim: number };

export function useBackgroundPhoto(): BackgroundPhoto | undefined {
  const { background } = useAccountSettings();

  const photoSrc = usePhotoSrc();

  const shown = shownBackground(background, usePhotos() ?? []);

  if (shown.mode === "season") return undefined;

  return { src: photoSrc(shown.photo.id, "display"), dim: background.dim };
}
