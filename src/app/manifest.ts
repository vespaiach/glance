import type { MetadataRoute } from "next";
import { copy } from "@/copy";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: copy.appName,
    short_name: copy.appName,
    start_url: "/today",
    scope: "/",
    display: "fullscreen",
    background_color: "#c8e6cd",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
