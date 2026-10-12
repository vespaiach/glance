"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useSyncStatus } from "@/data/repos";

const SIGN_IN = "/signin";

export function SessionGuard({ children }: { children: ReactNode }) {
  const router = useRouter();

  const ended = useSyncStatus()?.error === "unauthorized";

  useEffect(() => {
    if (ended) router.replace(SIGN_IN);
  }, [ended, router]);

  return children;
}
