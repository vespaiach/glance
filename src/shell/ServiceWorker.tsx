"use client";

import { useEffect } from "react";
import { appServiceWorker } from "@/data/repos";

export function ServiceWorker() {
  useEffect(() => appServiceWorker().register(), []);

  return null;
}
