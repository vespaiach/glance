export const GB = 1_000_000_000;

const MB = 1_000_000;

const ALMOST_FULL = 0.9;

export type StorageLevel = "ok" | "almost" | "full";

export type StorageMeter = {
  left: number;
  used: number;
  limit: number;
  unit: "GB" | "MB";
  level: StorageLevel;
  fraction: number;
};

export type PhotoUsage = { used: number; limit: number };

export function storageMeter(used: number, limit: number): StorageMeter {
  const counted = Math.min(used, limit);

  const fraction = counted / limit;

  const left = limit - counted;

  const unit = left < GB ? "MB" : "GB";

  return {
    left: unit === "MB" ? Math.round(left / MB) : tenthsOfGb(left),
    used: tenthsOfGb(counted),
    limit: tenthsOfGb(limit),
    unit,
    level: storageLevel(fraction),
    fraction,
  };
}

function tenthsOfGb(bytes: number): number {
  return Math.round(bytes / (GB / 10)) / 10;
}

function storageLevel(fraction: number): StorageLevel {
  if (fraction >= 1) return "full";

  return fraction >= ALMOST_FULL ? "almost" : "ok";
}
