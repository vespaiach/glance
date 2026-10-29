import { useReducer } from "react";
import { appServiceWorker, useServerVersion } from "@/data/repos";
import { APP_VERSION } from "@/domain/build";
import { RELOAD_IDLE, type ReloadApp, reloadApp } from "./reloadApp";

const TODAY_PATH = "/today";

export type ReloadAppRow = {
  current: string;
  next?: string;
  reload: ReloadApp;
  onAsk: () => void;
  onCancel: () => void;
  onReload: () => void;
};

export function useReloadApp(): ReloadAppRow {
  const next = useServerVersion();

  const [reload, dispatch] = useReducer(reloadApp, RELOAD_IDLE);

  const reloadNow = () => {
    dispatch({ type: "reload" });

    appServiceWorker().reload(TODAY_PATH);
  };

  return {
    current: APP_VERSION,
    ...(next !== undefined && { next }),
    reload,
    onAsk: () => dispatch({ type: "ask" }),
    onCancel: () => dispatch({ type: "cancel" }),
    onReload: reloadNow,
  };
}
