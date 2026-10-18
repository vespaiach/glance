const RANDOM_BYTES = 10;

export function uuidv7(
  now: Date,
  random: Uint8Array = crypto.getRandomValues(new Uint8Array(RANDOM_BYTES)),
): string {
  const [a = 0, b = 0, c = 0, ...rest] = random;

  return hexGroups([...timeBytes(now), 0x70 | (a & 0x0f), b, 0x80 | (c & 0x3f), ...rest]);
}

function timeBytes(now: Date): number[] {
  const ms = now.getTime();

  return [40, 32, 24, 16, 8, 0].map((shift) => Math.floor(ms / 2 ** shift) % 256);
}

function hexGroups(bytes: number[]): string {
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
