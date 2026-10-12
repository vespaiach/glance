import { wmo } from "./wmo";

describe("wmo", () => {
  it.each([
    [0, true, { icon: "sun", condition: "clear" }],
    [0, false, { icon: "moon", condition: "clear" }],
    [1, true, { icon: "cloud-sun", condition: "mostlyClear" }],
    [2, true, { icon: "cloud-sun", condition: "partlyCloudy" }],
    [2, false, { icon: "cloud-moon", condition: "partlyCloudy" }],
    [3, true, { icon: "cloudy", condition: "overcast" }],
    [45, true, { icon: "cloud-fog", condition: "fog" }],
    [48, true, { icon: "cloud-fog", condition: "fog" }],
    [51, true, { icon: "cloud-drizzle", condition: "drizzle" }],
    [57, true, { icon: "cloud-drizzle", condition: "freezingDrizzle" }],
    [61, true, { icon: "cloud-rain", condition: "lightRain" }],
    [63, true, { icon: "cloud-rain", condition: "rain" }],
    [65, true, { icon: "cloud-rain", condition: "heavyRain" }],
    [66, true, { icon: "cloud-rain", condition: "freezingRain" }],
    [71, true, { icon: "cloud-snow", condition: "lightSnow" }],
    [73, true, { icon: "cloud-snow", condition: "snow" }],
    [75, true, { icon: "cloud-snow", condition: "heavySnow" }],
    [77, true, { icon: "snowflake", condition: "snowGrains" }],
    [80, true, { icon: "cloud-rain", condition: "rainShowers" }],
    [82, true, { icon: "cloud-rain", condition: "rainShowers" }],
    [85, true, { icon: "cloud-snow", condition: "snowShowers" }],
    [95, true, { icon: "cloud-lightning", condition: "thunderstorm" }],
    [99, true, { icon: "cloud-lightning", condition: "thunderstormHail" }],
  ] as const)("WX-01 WMO code %i (day %s) maps to %o", (code, isDay, expected) => {
    expect(wmo(code, isDay)).toEqual(expected);
  });

  it("WX-01 an unknown code maps to nothing", () => {
    expect(wmo(42, true)).toBeUndefined();
  });
});
