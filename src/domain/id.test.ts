import { uuidv7 } from "./id";

const NOW = new Date("2026-10-09T17:41:00.000Z");

const ZEROS = new Uint8Array(10);

const ONES = new Uint8Array(10).fill(0xff);

describe("uuidv7", () => {
  it("D8 the id is a version 7 UUID with the RFC variant", () => {
    expect(uuidv7(NOW, ONES)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("D8 the first 48 bits are the Unix time in milliseconds", () => {
    const hex = uuidv7(NOW, ZEROS).replaceAll("-", "").slice(0, 12);

    expect(Number.parseInt(hex, 16)).toBe(NOW.getTime());
  });

  it("D8 ids sort by creation time", () => {
    const later = new Date(NOW.getTime() + 1);

    expect(uuidv7(NOW, ONES) < uuidv7(later, ZEROS)).toBe(true);
  });

  it("D8 the random bytes fill the rest", () => {
    expect(uuidv7(NOW, ONES).slice(14)).toBe("7fff-bfff-ffffffffffff");
  });
});
