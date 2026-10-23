import type { ReactNode } from "react";
import { type Harness, wrapperFor } from "@/data/repos/testHarness";
import type { AccountSettings } from "@/domain/schemas";
import { NowProvider } from "./now";
import { SettingsProvider } from "./settings";
import { WhoFilterProvider } from "./whoFilter";

export type ShellOptions = {
  frozenAt?: Date;
  overrides?: Partial<AccountSettings>;
  who?: readonly string[];
};

export function shellWrapper(store: Harness, options: ShellOptions = {}) {
  const Repos = wrapperFor(store);

  return ({ children }: { children: ReactNode }) => (
    <Repos>
      <NowProvider frozenAt={options.frozenAt}>
        <SettingsProvider overrides={options.overrides}>
          <WhoFilterProvider initial={options.who}>{children}</WhoFilterProvider>
        </SettingsProvider>
      </NowProvider>
    </Repos>
  );
}
