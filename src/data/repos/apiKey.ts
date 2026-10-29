import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiKey, NewApiKey } from "@/domain/apiKeys";
import type { Result } from "@/domain/result";
import type { TransportError } from "../sync/transport";
import { useRepoStore } from "./store";

export type ApiKeyRepo = {
  saved: ApiKey | null | undefined;
  create(): Promise<Result<NewApiKey, TransportError>>;
  revoke(): Promise<Result<void, TransportError>>;
};

export function useApiKey(online: boolean): ApiKeyRepo {
  const { apiKey } = useRepoStore();

  const [saved, setSaved] = useState<ApiKey | null>();

  const load = useCallback(async () => {
    const answer = await apiKey.get();

    if (answer.ok) setSaved(answer.value ?? null);
  }, [apiKey]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: coming back online reads the key again
  useEffect(() => {
    void load();
  }, [load, online]);

  return useMemo(
    () => ({
      saved,
      create: async () => {
        const created = await apiKey.create();

        if (created.ok) setSaved(created.value);
        else void load();

        return created;
      },
      revoke: async () => {
        const revoked = await apiKey.revoke();

        if (revoked.ok) setSaved(null);
        else void load();

        return revoked;
      },
    }),
    [apiKey, load, saved],
  );
}
