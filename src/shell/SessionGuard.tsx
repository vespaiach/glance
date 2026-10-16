"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { useMarkSignedOut, useSignedOut } from "@/data/repos";
import { isTextField } from "./keyboard";
import { useSheetHost } from "./SheetHost";

const SIGN_IN = "/signin";

const AMBIENT = "/ambient";

function useEditingField(): boolean {
  const [editing, setEditing] = useState(() => isTextField(document.activeElement));

  useEffect(() => {
    const focused = (event: FocusEvent) => setEditing(isTextField(event.target as Element));

    const blurred = (event: FocusEvent) =>
      setEditing(isTextField(event.relatedTarget as Element | null));

    document.addEventListener("focusin", focused);
    document.addEventListener("focusout", blurred);

    return () => {
      document.removeEventListener("focusin", focused);
      document.removeEventListener("focusout", blurred);
    };
  }, []);

  return editing;
}

function useMarkedSignedOut(signedOut: boolean): boolean {
  const markSignedOut = useMarkSignedOut();

  const [marked, setMarked] = useState(false);

  useEffect(() => {
    if (!signedOut) return;

    let live = true;

    void markSignedOut().then(() => {
      if (live) setMarked(true);
    });

    return () => {
      live = false;
    };
  }, [signedOut, markSignedOut]);

  return marked;
}

export function SessionGuard({ children }: { children: ReactNode }) {
  const router = useRouter();

  const pathname = usePathname();

  const { sheet } = useSheetHost();

  const editing = useEditingField();

  const marked = useMarkedSignedOut(useSignedOut());

  const leave = marked && sheet === null && !editing && pathname !== AMBIENT;

  useEffect(() => {
    if (leave) router.replace(SIGN_IN);
  }, [leave, router]);

  return children;
}
