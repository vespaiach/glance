import type { UploadProblem } from "@/domain/photoUpload";
import type { Result } from "@/domain/result";
import type { Account, LocationRequest, Weather, WeatherLocation } from "@/domain/schemas";
import type { OutboxEntry, StoredEvent, StoredNote, StoredPhoto, StoredSettings } from "../db";

export type TransportError = "network" | "unauthorized" | "invalid" | "outdated" | "server";

export type UploadError = TransportError | UploadProblem;

export type LocateError = TransportError | "outside";

export type Coordinates = Pick<WeatherLocation, "lat" | "lon">;

export type Change =
  | { entity: "events"; row: StoredEvent }
  | { entity: "notes"; row: StoredNote }
  | { entity: "photos"; row: StoredPhoto }
  | { entity: "settings"; row: StoredSettings };

export type PullResponse = { cursor: string; changes: Change[] };

export type AuthStatus =
  | { state: "waiting" }
  | { state: "expired"; email?: string }
  | { state: "finishing-elsewhere" }
  | { state: "signed-in"; account: Account; returning: boolean; setupDone: boolean };

export type LinkRequest = { email: string; timeZone: string };

type Answer<T, E = TransportError> = Promise<Result<T, E>>;

export interface Transport {
  push(entry: OutboxEntry): Answer<Change>;
  pull(cursor: string | undefined): Answer<PullResponse>;
  weather(): Answer<Weather>;
  places(query: string): Answer<WeatherLocation[]>;
  locate(position: Coordinates): Answer<WeatherLocation, LocateError>;
  auth: {
    link(request: LinkRequest): Answer<void>;
    status(): Answer<AuthStatus>;
    name(name: string): Answer<Account>;
    location(request: LocationRequest): Answer<void>;
    signout(): Answer<void>;
  };
  upload(
    file: File,
    modifiedOn: string,
    onProgress: (percent: number) => void,
  ): Answer<StoredPhoto, UploadError>;
}
