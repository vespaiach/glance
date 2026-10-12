"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useSettings } from "@/data/repos";
import type { AccountSettings } from "@/domain/schemas";

const SettingsContext = createContext<AccountSettings | undefined>(undefined);

export function SettingsProvider({
  overrides,
  children,
}: {
  overrides?: Partial<AccountSettings>;
  children: ReactNode;
}) {
  const saved = useSettings();

  const settings = useMemo(() => saved && { ...saved, ...overrides }, [saved, overrides]);

  if (settings === undefined) return null;

  return <SettingsContext value={settings}>{children}</SettingsContext>;
}

export function useAccountSettings(): AccountSettings {
  const settings = useContext(SettingsContext);

  if (settings === undefined) throw new Error("useAccountSettings needs a SettingsProvider");

  return settings;
}
