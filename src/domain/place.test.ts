import { stateCode } from "./place";

describe("stateCode", () => {
  it("WX-01 turns a state name into its two-letter code", () => {
    expect(stateCode("Oregon")).toBe("OR");
    expect(stateCode("new  york")).toBe("NY");
  });

  it("WX-01 has no code for a region that isn't a state", () => {
    expect(stateCode("Ontario")).toBeUndefined();
  });
});
