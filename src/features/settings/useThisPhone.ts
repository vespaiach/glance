"use client";

import { useEffect, useReducer } from "react";
import { useDevicePush } from "@/data/repos";
import { type ThisPhone, thisPhone } from "./thisPhone";

export type ThisPhoneRow = {
  phone: ThisPhone;
  allow(): void;
  turnOff(): void;
};

const UNSUPPORTED: ThisPhone = { kind: "unsupported" };

export function useThisPhone(): ThisPhoneRow {
  const device = useDevicePush();

  const [phone, dispatch] = useReducer(thisPhone, UNSUPPORTED);

  useEffect(() => {
    let live = true;

    void device.check().then((found) => {
      if (live) dispatch({ type: "checked", ...found });
    });

    return () => {
      live = false;
    };
  }, [device]);

  return {
    phone,
    allow: () => {
      dispatch({ type: "allow" });

      void device.allow().then((answer) => dispatch({ type: answer }));
    },
    turnOff: () => {
      dispatch({ type: "turn-off" });

      void device.turnOff().finally(() => dispatch({ type: "turned-off" }));
    },
  };
}
