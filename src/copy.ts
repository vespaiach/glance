import type { Season } from "@/domain/schemas";
import type { WmoCondition } from "@/domain/wmo";

export const copy = {
  appName: "Glance",
  season: {
    spring: "Spring",
    summer: "Summer",
    fall: "Fall",
    winter: "Winter",
  } satisfies Record<Season, string>,
  events: {
    now: "Now",
  },
  notes: {
    guestAuthor: "Guest",
    justNow: "Just now",
  },
  weather: {
    range: {
      high: "H",
      low: "L",
      feelsLike: "Feels like",
    },
    condition: {
      clear: "Clear",
      mostlyClear: "Mostly clear",
      partlyCloudy: "Partly cloudy",
      overcast: "Overcast",
      fog: "Fog",
      drizzle: "Drizzle",
      freezingDrizzle: "Freezing drizzle",
      lightRain: "Light rain",
      rain: "Rain",
      heavyRain: "Heavy rain",
      freezingRain: "Freezing rain",
      lightSnow: "Light snow",
      snow: "Snow",
      heavySnow: "Heavy snow",
      snowGrains: "Snow grains",
      rainShowers: "Rain showers",
      snowShowers: "Snow showers",
      thunderstorm: "Thunderstorm",
      thunderstormHail: "Thunderstorm with hail",
    } satisfies Record<WmoCondition, string>,
  },
} as const;
