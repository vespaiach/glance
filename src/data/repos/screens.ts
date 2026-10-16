import { useEffect, useState } from "react";
import { deviceOf, type SignedInScreen } from "@/domain/screens";
import { useRepoStore } from "./store";

export type { SignedInScreen };

function thisScreen(now: Date): SignedInScreen {
  return {
    id: "this-screen",
    ...deviceOf(navigator.userAgent),
    lastSeenAt: now.toISOString(),
    current: true,
  };
}

export function useSignedInScreens(): SignedInScreen[] {
  const { displays, now } = useRepoStore();

  const [alone] = useState(() => [thisScreen(now())]);

  const [listed, setListed] = useState<SignedInScreen[]>();

  useEffect(() => {
    let live = true;

    void displays().then((answer) => {
      if (live && answer.ok) setListed(answer.value);
    });

    return () => {
      live = false;
    };
  }, [displays]);

  return listed ?? alone;
}
