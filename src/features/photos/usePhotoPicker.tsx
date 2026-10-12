"use client";

import { type ChangeEvent, type ReactNode, useRef } from "react";
import { copy } from "@/copy";

export type PhotoPicker = { open(): void; input: ReactNode };

export function usePhotoPicker(onFiles: (files: File[]) => void): PhotoPicker {
  const ref = useRef<HTMLInputElement>(null);

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);

    event.currentTarget.value = "";

    if (files.length > 0) onFiles(files);
  };

  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      multiple
      hidden
      aria-label={copy.photos.picker}
      onChange={change}
    />
  );

  return { open: () => ref.current?.click(), input };
}
