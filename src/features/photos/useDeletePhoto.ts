"use client";

import { usePhotosRepo, useSettingsRepo } from "@/data/repos";
import { backgroundAfterDelete } from "@/domain/background";
import { useAccountSettings } from "@/shell/providers/settings";

export function useDeletePhoto(): (photoId: string) => void {
  const photos = usePhotosRepo();

  const settings = useSettingsRepo();

  const { background } = useAccountSettings();

  return (photoId) => {
    void photos.remove(photoId);

    const next = backgroundAfterDelete(background, photoId);

    if (next !== background) void settings.update({ background: next });
  };
}
