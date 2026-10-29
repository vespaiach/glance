import packageJson from "../../package.json";
import { APP_VERSION, BUILD_HEADER, CLIENT_BUILD, isNewerVersion, isSupportedBuild } from "./build";

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

describe("isNewerVersion", () => {
  it("SET-21 a higher patch, minor or major version is newer", () => {
    expect(isNewerVersion("1.0.1", "1.0.0")).toBe(true);
    expect(isNewerVersion("1.1.0", "1.0.9")).toBe(true);
    expect(isNewerVersion("2.0.0", "1.9.9")).toBe(true);
  });

  it("SET-21 compares each part as a number", () => {
    expect(isNewerVersion("1.10.0", "1.9.0")).toBe(true);
  });

  it("SET-21 the same or an older version is not newer", () => {
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
    expect(isNewerVersion("1.0.0", "1.2.0")).toBe(false);
  });

  it("SET-21 the app's version is package.json's", () => {
    expect(APP_VERSION).toBe(packageJson.version);
  });
});
