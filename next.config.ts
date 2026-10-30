import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { version } from "./package.json";

const PAGE_EXTENSIONS = ["tsx", "ts"];

const API_CORS_HEADERS = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, DELETE, OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Authorization, Content-Type" },
  { key: "Access-Control-Expose-Headers", value: "Retry-After" },
  { key: "Access-Control-Max-Age", value: "86400" },
];

const DEV_PAGE_EXTENSIONS = ["dev.tsx", ...PAGE_EXTENSIONS];

export default function nextConfig(phase: string): NextConfig {
  return withSerwist({
    productionBrowserSourceMaps: true,
    env: { NEXT_PUBLIC_APP_VERSION: version },
    pageExtensions: phase === PHASE_DEVELOPMENT_SERVER ? DEV_PAGE_EXTENSIONS : PAGE_EXTENSIONS,
    redirects: async () => [{ source: "/", destination: "/today", permanent: false }],
    headers: async () => [{ source: "/api/v1/:path*", headers: API_CORS_HEADERS }],
  });
}
