import { useEffect, useState } from "react";
import type { PhotoUsage } from "@/domain/storage";
import { useRepoStore } from "./store";

export type { PhotoUsage };

export function usePhotoUsage(): PhotoUsage | undefined {
  const { photoUsage } = useRepoStore();

  const [usage, setUsage] = useState<PhotoUsage>();

  useEffect(() => {
    let live = true;

    void photoUsage().then((answer) => {
      if (live && answer.ok) setUsage(answer.value);
    });

    return () => {
      live = false;
    };
  }, [photoUsage]);

  return usage;
}
