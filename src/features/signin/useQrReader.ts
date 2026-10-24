import jsQR from "jsqr";
import { type RefObject, useEffect, useEffectEvent } from "react";
import { frameCrop } from "./scan";

const READ_EVERY_MS = 150;

const SAMPLE_PX = 480;

export function useQrReader(
  video: RefObject<HTMLVideoElement | null>,
  frame: RefObject<HTMLElement | null>,
  active: boolean,
  onRead: (text: string) => void,
) {
  const read = useEffectEvent(onRead);

  useEffect(() => {
    if (!active) return;

    const canvas = document.createElement("canvas");

    const timer = setInterval(() => {
      const image =
        video.current && frame.current && frameImage(canvas, video.current, frame.current);

      const code =
        image && jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });

      if (code) read(code.data);
    }, READ_EVERY_MS);

    return () => clearInterval(timer);
  }, [active, video, frame]);
}

function frameImage(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  frame: HTMLElement,
): ImageData | undefined {
  if (video.readyState < video.HAVE_CURRENT_DATA) return undefined;

  const crop = frameCrop(
    video.getBoundingClientRect(),
    videoSize(video),
    frame.getBoundingClientRect(),
  );

  const size = Math.min(SAMPLE_PX, Math.round(crop.size));

  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  context?.drawImage(video, crop.x, crop.y, crop.size, crop.size, 0, 0, size, size);

  return context?.getImageData(0, 0, size, size);
}

function videoSize(video: HTMLVideoElement) {
  return { width: video.videoWidth, height: video.videoHeight };
}
