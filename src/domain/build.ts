export const BUILD_HEADER = "x-glance-build";

export const CLIENT_BUILD = 7;

export function isSupportedBuild(header: string | null, minimum: number): boolean {
  if (header === null || !/^\d+$/.test(header)) return false;

  return Number(header) >= minimum;
}
