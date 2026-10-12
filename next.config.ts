import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const PAGE_EXTENSIONS = ["tsx", "ts"];

const DEMO_PAGE_EXTENSIONS = ["demo.tsx", ...PAGE_EXTENSIONS];

export default function nextConfig(phase: string): NextConfig {
  const demo = phase === PHASE_DEVELOPMENT_SERVER || process.env.NEXT_PUBLIC_DEMO === "1";

  return {
    output: "standalone",
    pageExtensions: demo ? DEMO_PAGE_EXTENSIONS : PAGE_EXTENSIONS,
    redirects: async () => [{ source: "/", destination: "/today", permanent: false }],
  };
}
