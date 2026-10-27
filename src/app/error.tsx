"use client";

import { CrashScreen } from "@/shell/CrashScreen";

export default function ErrorPage({ error }: { error: Error }) {
  return <CrashScreen error={error} />;
}
