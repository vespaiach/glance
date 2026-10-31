import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";
import { APP_VERSION } from "@/domain/build";

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
    esbuildOptions: {
      format: "iife",
      define: { "process.env.NEXT_PUBLIC_APP_VERSION": JSON.stringify(APP_VERSION) },
    },
    globPatterns: [".next/static/**/*.{js,css,woff2,png,svg,ico,webp}", "public/**/*"],
    globIgnores: ["**/node_modules/**/*"],
    additionalPrecacheEntries: [{ url: "/manifest.webmanifest", revision: randomUUID() }],
  },
);
