import { copy } from "@/copy";
import { stateCode } from "@/domain/place";
import type { WeatherLocation } from "@/domain/schemas";
import { timeZoneName } from "@/domain/zoneName";

export function placeLabel({ name, region }: WeatherLocation): string {
  return copy.weather.place(name, stateCode(region) ?? region);
}

export function locationSummary(location: WeatherLocation | undefined): string {
  if (!location) return copy.settings.location.notSet;

  const place = placeLabel(location);

  return location.timeZone
    ? copy.settings.location.summary(place, timeZoneName(location.timeZone))
    : place;
}
