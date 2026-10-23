"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import type { TagFilter } from "@/domain/tags";

type WhoFilter = { filter: TagFilter; setFilter: (filter: TagFilter) => void };

const WhoFilterContext = createContext<WhoFilter | undefined>(undefined);

export function WhoFilterProvider({
  initial,
  children,
}: {
  initial?: readonly string[];
  children: ReactNode;
}) {
  const [filter, setFilter] = useState<TagFilter>(() => (initial ? new Set(initial) : "all"));

  return <WhoFilterContext value={{ filter, setFilter }}>{children}</WhoFilterContext>;
}

export function useWhoFilter(): WhoFilter {
  const who = useContext(WhoFilterContext);

  if (who === undefined) throw new Error("useWhoFilter needs a WhoFilterProvider");

  return who;
}
