import { displayTemp, displayWind, toCelsius } from "./temperature";

describe("temperature", () => {
  it.each([
    [32, 0],
    [212, 100],
    [64, 18],
    [51, 11],
    [0, -18],
    [-40, -40],
  ])("WX-02 %i °F is %i °C", (f, c) => {
    expect(toCelsius(f)).toBe(c);
  });

  it("WX-02 Fahrenheit stays as stored", () => {
    expect(displayTemp(64, "F")).toBe(64);
  });

  it("WX-02 Celsius converts the stored Fahrenheit", () => {
    expect(displayTemp(64, "C")).toBe(18);
  });

  it("WX-02 wind stays in mph with Fahrenheit", () => {
    expect(displayWind(8, "F")).toBe(8);
  });

  it("WX-02 wind turns into km/h with Celsius", () => {
    expect(displayWind(8, "C")).toBe(13);
  });
});
