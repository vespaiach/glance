import { err, ok, type Result } from "@/domain/result";
import type { Coordinates } from "../sync/transport";

export type PositionError = "denied" | "no-position";

export type DevicePosition = {
  available(): Promise<boolean>;
  current(): Promise<Result<Coordinates, PositionError>>;
};

const PERMISSION_DENIED = 1;

const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 600_000,
};

function positionError({ code }: GeolocationPositionError): PositionError {
  return code === PERMISSION_DENIED ? "denied" : "no-position";
}

export function currentPosition(): Promise<Result<Coordinates, PositionError>> {
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve(ok({ lat: coords.latitude, lon: coords.longitude })),
      (error) => resolve(err(positionError(error))),
      POSITION_OPTIONS,
    ),
  );
}

async function permissionBlocked(): Promise<boolean> {
  if (navigator.permissions === undefined) return false;

  const status = await navigator.permissions.query({ name: "geolocation" }).catch(() => undefined);

  return status?.state === "denied";
}

export async function canLocate(): Promise<boolean> {
  if (!globalThis.isSecureContext || !("geolocation" in navigator)) return false;

  return !(await permissionBlocked());
}

export const devicePosition: DevicePosition = { available: canLocate, current: currentPosition };
