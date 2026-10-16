"use client";

import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import type { Season } from "@/domain/schemas";
import { seasonVideoPath } from "@/domain/season";
import { season as seasonVars } from "@/theme/seasons.stylex";

const styles = stylex.create({
  layer: {
    position: "absolute",
    inset: 0,
    zIndex: -1,
    pointerEvents: "none",
    overflow: "hidden",
  },
  video: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  tint: {
    position: "absolute",
    inset: 0,
    backgroundColor: seasonVars.deep,
    opacity: 0.7,
  },
});

export function SeasonVideo({ season }: { season: Season }) {
  const [failedSrc, setFailedSrc] = useState<string>();

  const src = seasonVideoPath(season);

  if (failedSrc === src) return null;

  const fail = () => setFailedSrc(src);

  return (
    <div aria-hidden="true" {...stylex.props(styles.layer)}>
      <video
        key={src}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        ref={(video) => {
          if (video?.error) fail();
        }}
        onError={fail}
        {...stylex.props(styles.video)}
      />
      <div data-video-tint {...stylex.props(styles.tint)} />
    </div>
  );
}
