import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const PAGE_EXTENSIONS = ["tsx", "ts"];

const DEV_PAGE_EXTENSIONS = ["dev.tsx", ...PAGE_EXTENSIONS];

export default function nextConfig(phase: string): NextConfig {
  return withSerwist({
    pageExtensions: phase === PHASE_DEVELOPMENT_SERVER ? DEV_PAGE_EXTENSIONS : PAGE_EXTENSIONS,
    redirects: async () => [{ source: "/", destination: "/today", permanent: false }],
  });
}
