import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
    esbuildOptions: { format: "iife" },
    globPatterns: [".next/static/**/*.{js,css,woff2,png,svg,ico,webp}", "public/**/*"],
    additionalPrecacheEntries: [{ url: "/manifest.webmanifest", revision: randomUUID() }],
  },
);
