export const BUILD_HEADER = "x-glance-build";

export const CLIENT_BUILD = 15;

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

export function isSupportedBuild(header: string | null, minimum: number): boolean {
  if (header === null || !/^\d+$/.test(header)) return false;

  return Number(header) >= minimum;
}

export function isNewerVersion(server: string, current: string): boolean {
  const theirs = versionParts(server);

  const ours = versionParts(current);

  const first = theirs.findIndex((part, i) => part !== (ours[i] ?? 0));

  return first !== -1 && (theirs[first] ?? 0) > (ours[first] ?? 0);
}

function versionParts(version: string): number[] {
  return version.split(".").map(Number);
}
