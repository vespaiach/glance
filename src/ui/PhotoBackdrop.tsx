"use client";

import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { motion } from "@/theme/tokens.stylex";

type Layers = {
  current: string | undefined;
  previous: string | undefined;
  changed: boolean;
};

const fadeIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const fadeOut = stylex.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0 },
});

const styles = stylex.create({
  layer: {
    position: "absolute",
    inset: 0,
    zIndex: -1,
    pointerEvents: "none",
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
  },
  image: (image: string) => ({
    backgroundImage: image,
  }),
  enter: {
    animationName: fadeIn,
    animationDuration: motion.durSeason,
    animationTimingFunction: motion.easeInOut,
  },
  leave: {
    animationName: fadeOut,
    animationDuration: motion.durSeason,
    animationTimingFunction: motion.easeInOut,
    animationFillMode: "forwards",
  },
});

function Layer({ image, fade }: { image: string; fade?: stylex.StyleXStyles }) {
  return (
    <div
      aria-hidden="true"
      data-backdrop={image}
      {...stylex.props(styles.layer, styles.image(image), fade)}
    />
  );
}

export function PhotoBackdrop({ image }: { image: string | undefined }) {
  const [layers, setLayers] = useState<Layers>({
    current: image,
    previous: undefined,
    changed: false,
  });

  if (layers.current !== image)
    setLayers({ current: image, previous: layers.current, changed: true });

  const { current, previous, changed } = layers;

  return (
    <>
      {previous !== undefined && (
        <Layer key={previous} image={previous} fade={current === undefined && styles.leave} />
      )}
      {current !== undefined && (
        <Layer key={current} image={current} fade={changed && styles.enter} />
      )}
    </>
  );
}
