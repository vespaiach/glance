import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
    esbuildOptions: { format: "iife" },
    globPatterns: [".next/static/**/*.{js,css,woff2,png,svg,ico,webp}", "public/**/*"],
    globIgnores: ["**/node_modules/**/*", "public/videos/**"],
    additionalPrecacheEntries: [{ url: "/manifest.webmanifest", revision: randomUUID() }],
  },
);
