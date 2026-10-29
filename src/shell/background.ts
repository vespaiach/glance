import { usePhotoSrc, usePhotos } from "@/data/repos";
import { ambientDim } from "@/domain/ambient";
import { drawingSrc, type ShownBackground, shownBackground } from "@/domain/background";
import { useNow } from "./providers/now";
import { useSeason } from "./providers/season";
import { useAccountSettings } from "./providers/settings";
import { useTimeZone } from "./providers/timeZone";

export type BackgroundImage = { src: string; dim: number };

type Scene = "day" | "ambient";

export function useBackgroundImage(scene: Scene = "day"): BackgroundImage | undefined {
  const { background } = useAccountSettings();

  const photoSrc = usePhotoSrc();

  const photos = usePhotos() ?? [];

  const shown = shownBackground(background, photos, useNow("minute"), useTimeZone(), useSeason());

  return imageFor(shown, background.dim, scene, (id) => photoSrc(id, "display"));
}

function imageFor(
  shown: ShownBackground,
  dim: number,
  scene: Scene,
  photoSrc: (id: string) => string,
): BackgroundImage | undefined {
  const ambient = scene === "ambient";

  if (shown.mode === "blank") return undefined;

  if (shown.mode === "season")
    return { src: drawingSrc(shown.drawing, ambient), dim: ambient ? 0 : dim };

  return { src: photoSrc(shown.photo.id), dim: ambient ? ambientDim(dim) : dim };
}
