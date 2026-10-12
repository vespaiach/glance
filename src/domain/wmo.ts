import type { WeatherIcon } from "./schemas";

export type WmoCondition =
  | "clear"
  | "mostlyClear"
  | "partlyCloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "freezingDrizzle"
  | "lightRain"
  | "rain"
  | "heavyRain"
  | "freezingRain"
  | "lightSnow"
  | "snow"
  | "heavySnow"
  | "snowGrains"
  | "rainShowers"
  | "snowShowers"
  | "thunderstorm"
  | "thunderstormHail";

export interface WmoWeather {
  icon: WeatherIcon;
  condition: WmoCondition;
}

type IconPair = readonly [day: WeatherIcon, night: WeatherIcon];

const same = (icon: WeatherIcon): IconPair => [icon, icon];

const CODES: Record<number, readonly [IconPair, WmoCondition]> = {
  0: [["sun", "moon"], "clear"],
  1: [["cloud-sun", "cloud-moon"], "mostlyClear"],
  2: [["cloud-sun", "cloud-moon"], "partlyCloudy"],
  3: [same("cloudy"), "overcast"],
  45: [same("cloud-fog"), "fog"],
  48: [same("cloud-fog"), "fog"],
  51: [same("cloud-drizzle"), "drizzle"],
  53: [same("cloud-drizzle"), "drizzle"],
  55: [same("cloud-drizzle"), "drizzle"],
  56: [same("cloud-drizzle"), "freezingDrizzle"],
  57: [same("cloud-drizzle"), "freezingDrizzle"],
  61: [same("cloud-rain"), "lightRain"],
  63: [same("cloud-rain"), "rain"],
  65: [same("cloud-rain"), "heavyRain"],
  66: [same("cloud-rain"), "freezingRain"],
  67: [same("cloud-rain"), "freezingRain"],
  71: [same("cloud-snow"), "lightSnow"],
  73: [same("cloud-snow"), "snow"],
  75: [same("cloud-snow"), "heavySnow"],
  77: [same("snowflake"), "snowGrains"],
  80: [same("cloud-rain"), "rainShowers"],
  81: [same("cloud-rain"), "rainShowers"],
  82: [same("cloud-rain"), "rainShowers"],
  85: [same("cloud-snow"), "snowShowers"],
  86: [same("cloud-snow"), "snowShowers"],
  95: [same("cloud-lightning"), "thunderstorm"],
  96: [same("cloud-lightning"), "thunderstormHail"],
  99: [same("cloud-lightning"), "thunderstormHail"],
};

export function wmo(code: number, isDay: boolean): WmoWeather | undefined {
  const entry = CODES[code];

  if (entry === undefined) return undefined;

  const [[day, night], condition] = entry;

  return { icon: isDay ? day : night, condition };
}
