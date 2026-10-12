import "server-only";
import type { Result } from "@/domain/result";
import type { Weather, WeatherLocation } from "@/domain/schemas";

export type Forecast = Omit<Weather, "location">;

export type WeatherFailure = "weather-failed";

export type LocateFailure = "not-found" | WeatherFailure;

export type PlaceName = Pick<WeatherLocation, "name" | "region">;

export type Coordinates = Pick<WeatherLocation, "lat" | "lon">;

export interface WeatherProvider {
  forecast(place: Coordinates, now: Date): Promise<Result<Forecast, WeatherFailure>>;
  places(query: string): Promise<Result<WeatherLocation[], WeatherFailure>>;
  timeZoneAt(place: Coordinates): Promise<Result<string, WeatherFailure>>;
}

export interface PlaceLocator {
  placeAt(place: Coordinates): Promise<Result<PlaceName, LocateFailure>>;
}
