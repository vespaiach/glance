import { useEffect, useState } from "react";
import { UPDATE_CHECK_MS } from "./serviceWorker";
import { useRepoStore } from "./store";

export function useServerVersion(): string | undefined {
  const { serverVersion } = useRepoStore();

  const [version, setVersion] = useState<string>();

  useEffect(() => {
    let live = true;

    const read = () => {
      void serverVersion().then((answer) => {
        if (live && answer.ok) setVersion(answer.value);
      });
    };

    read();

    const timer = setInterval(read, UPDATE_CHECK_MS);

    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [serverVersion]);

  return version;
}
