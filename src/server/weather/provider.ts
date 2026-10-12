import "server-only";
import type { Result } from "@/domain/result";
import type { Weather, WeatherLocation } from "@/domain/schemas";

export type Forecast = Omit<Weather, "location">;

export type WeatherFailure = "weather-failed";

export type Coordinates = Pick<WeatherLocation, "lat" | "lon">;

export interface WeatherProvider {
  forecast(place: Coordinates, now: Date): Promise<Result<Forecast, WeatherFailure>>;
  places(query: string): Promise<Result<WeatherLocation[], WeatherFailure>>;
}
