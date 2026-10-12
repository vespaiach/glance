import type { AccountSettings } from "./schemas";

export function toCelsius(fahrenheit: number): number {
  return Math.round(((fahrenheit - 32) * 5) / 9) || 0;
}

export function displayTemp(fahrenheit: number, unit: AccountSettings["tempUnit"]): number {
  return unit === "C" ? toCelsius(fahrenheit) : fahrenheit;
}
