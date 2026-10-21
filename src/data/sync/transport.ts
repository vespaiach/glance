import type { UploadProblem } from "@/domain/photoUpload";
import type { Result } from "@/domain/result";
import type { Account, LocationRequest, Weather, WeatherLocation } from "@/domain/schemas";
import type { SignedInScreen } from "@/domain/screens";
import type {
  OutboxEntry,
  StoredEvent,
  StoredMember,
  StoredNote,
  StoredPhoto,
  StoredSettings,
} from "../db";

export type TransportError = "network" | "unauthorized" | "invalid" | "outdated" | "server";

export type UploadError = TransportError | UploadProblem;

export type LocateError = TransportError | "outside";

export type Coordinates = Pick<WeatherLocation, "lat" | "lon">;

export type Change =
  | { entity: "members"; row: StoredMember }
  | { entity: "events"; row: StoredEvent }
  | { entity: "notes"; row: StoredNote }
  | { entity: "photos"; row: StoredPhoto }
  | { entity: "settings"; row: StoredSettings };

export type PullResponse = { cursor: string; changes: Change[] };

export type SignedIn = {
  state: "signed-in";
  account: Account;
  returning: boolean;
  setupDone: boolean;
};

export type AuthStatus = SignedIn | { state: "signed-out" };

export type CodeError = "wrong-code" | "code-locked" | "code-expired";

export type QrCode = { url: string };

export type CodeRequest = { email: string; timeZone: string };

export type CodeVerify = { email: string; code: string };

type Answer<T, E = TransportError> = Promise<Result<T, E>>;

export interface Transport {
  push(entry: OutboxEntry): Answer<Change>;
  pull(cursor: string | undefined): Answer<PullResponse>;
  weather(): Answer<Weather>;
  places(query: string): Answer<WeatherLocation[]>;
  locate(position: Coordinates): Answer<WeatherLocation, LocateError>;
  displays(): Answer<SignedInScreen[]>;
  issueQr(): Answer<QrCode>;
  voidQr(url: string): Answer<void>;
  auth: {
    sendCode(request: CodeRequest): Answer<void>;
    verifyCode(request: CodeVerify): Answer<SignedIn, TransportError | CodeError>;
    status(): Answer<AuthStatus>;
    guestAvailable(): Promise<boolean>;
    guest(): Answer<AuthStatus>;
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
