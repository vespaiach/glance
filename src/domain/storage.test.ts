import { GB, storageMeter } from "./storage";

const LIMIT = 5 * GB;

describe("storageMeter", () => {
  it("SET-13 an empty account has the whole limit left", () => {
    expect(storageMeter(0, LIMIT)).toEqual({
      left: 5,
      used: 0,
      limit: 5,
      unit: "GB",
      level: "ok",
      fraction: 0,
    });
  });

  it("SET-13 below 90% is ok", () => {
    expect(storageMeter(0.899 * LIMIT, LIMIT)).toEqual({
      left: 505,
      used: 4.5,
      limit: 5,
      unit: "MB",
      level: "ok",
      fraction: 0.899,
    });
  });

  it("SET-13 from 90% is almost full", () => {
    expect(storageMeter(0.9 * LIMIT, LIMIT)).toMatchObject({ level: "almost", fraction: 0.9 });
  });

  it("SET-13 at the limit is full with nothing left", () => {
    expect(storageMeter(LIMIT, LIMIT)).toMatchObject({
      left: 0,
      used: 5,
      level: "full",
      fraction: 1,
    });
  });

  it("SET-13 past the limit still reads full at the limit", () => {
    expect(storageMeter(LIMIT + GB, LIMIT)).toMatchObject({
      left: 0,
      used: 5,
      level: "full",
      fraction: 1,
    });
  });

  it("SET-13 values round to 0.1 GB", () => {
    expect(storageMeter(3.24 * GB, LIMIT)).toMatchObject({ left: 1.8, used: 3.2, unit: "GB" });
  });

  it("SET-13 under 1 GB left is shown in MB", () => {
    expect(storageMeter(4.6 * GB, LIMIT)).toMatchObject({ left: 400, unit: "MB" });
  });
});
