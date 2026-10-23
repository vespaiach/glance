"use client";

import { useEffect, useEffectEvent, useReducer, useRef } from "react";
import { useQrCodes } from "@/data/repos";
import { QR_CODE_TTL_MS, type QrOpens, qrSecondsLeft } from "@/domain/qrSignIn";
import { useNow, useNowStore } from "@/shell/providers/now";
import { initialQrTile, type QrFixture, type QrTile, qrTile } from "./qrTile";

export type QrSignIn = {
  tile: QrTile;
  secondsLeft: number;
  show(): void;
  close(): void;
};

const TTL_S = QR_CODE_TTL_MS / 1000;

export function useQrTile(fixture: QrFixture | undefined, opens?: QrOpens): QrSignIn {
  const { issueQr, voidQr } = useQrCodes();

  const clock = useNowStore();

  const [tile, dispatch] = useReducer(qrTile, fixture, initialQrTile);

  const now = useNow(tile.kind === "open" ? "second" : "minute");

  const request = useRef(0);

  const latest = useRef(tile);

  useEffect(() => {
    latest.current = tile;
  });

  const issue = async () => {
    request.current += 1;

    const asked = request.current;

    const answer = await issueQr(opens);

    if (asked !== request.current) {
      if (answer.ok) void voidQr(answer.value.url);

      return;
    }

    dispatch(
      answer.ok
        ? { type: "issued", url: answer.value.url, at: clock.get().toISOString() }
        : { type: "fail" },
    );
  };

  const forget = () => {
    request.current += 1;

    if (latest.current.kind === "open") void voidQr(latest.current.url);
  };

  const secondsLeft = tile.kind === "open" ? qrSecondsLeft(tile.issuedAt, now) : TTL_S;

  const expired = tile.kind === "open" && secondsLeft === 0;

  const onExpired = useEffectEvent(() => {
    dispatch({ type: "expire" });

    void issue();
  });

  const onOpened = useEffectEvent(() => {
    if (latest.current.kind === "issuing") void issue();

    return forget;
  });

  useEffect(() => {
    if (expired) onExpired();
  }, [expired]);

  useEffect(() => onOpened(), []);

  return {
    tile,
    secondsLeft,
    show: () => {
      dispatch({ type: "show" });

      void issue();
    },
    close: () => {
      forget();

      dispatch({ type: "close" });
    },
  };
}
