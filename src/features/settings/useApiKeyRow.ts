import { useReducer } from "react";
import { copy } from "@/copy";
import { useApiKey } from "@/data/repos";
import type { ApiKey } from "@/domain/apiKeys";
import { activeStamp } from "@/domain/screens";
import { API_KEY_IDLE, apiKeyRow } from "./apiKeyRow";
import type { ApiKeyRowProps, SavedApiKey } from "./components/ApiKeyRow";

export function useApiKeyRow(
  online: boolean,
  now: Date,
  tz: string,
): Omit<ApiKeyRowProps, "online"> {
  const repo = useApiKey(online);

  const [row, dispatch] = useReducer(apiKeyRow, API_KEY_IDLE);

  const create = async () => {
    dispatch({ type: "create" });

    const created = await repo.create();

    dispatch(created.ok ? { type: "created", key: created.value.key } : { type: "failed" });
  };

  const copyKey = async () => {
    if (row.kind !== "shown") return;

    const written = await navigator.clipboard.writeText(row.key).then(
      () => true,
      () => false,
    );

    if (written) dispatch({ type: "copied" });
  };

  const revoke = () => {
    dispatch({ type: "revoke" });

    void repo.revoke();
  };

  return {
    host: location.host,
    saved: repo.saved && savedKey(repo.saved, now, tz),
    row,
    onCreate: () => void create(),
    onCopy: () => void copyKey(),
    onDone: () => dispatch({ type: "done" }),
    onAsk: () => dispatch({ type: "ask" }),
    onCancel: () => dispatch({ type: "cancel" }),
    onRevoke: revoke,
  };
}

function savedKey(saved: ApiKey, now: Date, tz: string): SavedApiKey {
  const stamp = saved.lastUsedAt === null ? null : activeStamp(saved.lastUsedAt, now, tz);

  return { tail: saved.tail, used: copy.settings.apiKey.used(stamp) };
}
