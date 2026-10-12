import { BUILD_HEADER, CLIENT_BUILD, isSupportedBuild } from "./build";

describe("isSupportedBuild", () => {
  it("tech§4.5 accepts this client's own build", () => {
    expect(isSupportedBuild(String(CLIENT_BUILD), CLIENT_BUILD)).toBe(true);
  });

  it("tech§4.5 accepts a build newer than the minimum", () => {
    expect(isSupportedBuild("3", 2)).toBe(true);
  });

  it("tech§4.5 rejects a build older than the minimum", () => {
    expect(isSupportedBuild("1", 2)).toBe(false);
  });

  it("tech§4.5 rejects a request without a build", () => {
    expect(isSupportedBuild(null, 1)).toBe(false);
  });

  it("tech§4.5 rejects a build that is not a whole number", () => {
    expect(isSupportedBuild("1.5", 1)).toBe(false);
    expect(isSupportedBuild("abc", 1)).toBe(false);
    expect(isSupportedBuild("", 1)).toBe(false);
  });

  it("tech§4.5 names the header in lowercase", () => {
    expect(BUILD_HEADER).toBe("x-glance-build");
  });
});
