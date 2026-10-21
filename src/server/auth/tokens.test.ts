import { newCode } from "./tokens";

describe("newCode", () => {
  it("D11 is always six digits, zero-padded", () => {
    const codes = Array.from({ length: 2000 }, newCode);

    expect(codes.every((code) => /^\d{6}$/.test(code))).toBe(true);
    expect(codes.some((code) => code.startsWith("0"))).toBe(true);
  });
});
