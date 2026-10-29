import type { ImportResult, ImportReview, ImportWho, LastImport } from "@/domain/imports";
import type { UploadProblem } from "@/domain/photoUpload";
import type { QrOpens } from "@/domain/qrSignIn";
import type { Result } from "@/domain/result";
import type {
  Account,
  LocationRequest,
  PushSubscription,
  Weather,
  WeatherLocation,
} from "@/domain/schemas";
import type { SignedInScreen } from "@/domain/screens";
import type { PhotoUsage } from "@/domain/storage";
import type {
  OutboxEntry,
  StoredEvent,
  StoredNote,
  StoredPhoto,
  StoredSettings,
  StoredTag,
} from "../db";

export type TransportError =
  | "network"
  | "unauthorized"
  | "revoked"
  | "invalid"
  | "outdated"
  | "server";

export type UploadError = TransportError | UploadProblem;

export type ImportError = TransportError | "not-ics" | "no-upcoming" | "too-large";

export type LocateError = TransportError | "outside";

export type Coordinates = Pick<WeatherLocation, "lat" | "lon">;

export type Change =
  | { entity: "tags"; row: StoredTag }
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
  photoUsage(): Answer<PhotoUsage>;
  issueQr(opens?: QrOpens): Answer<QrCode>;
  voidQr(url: string): Answer<void>;
  imports: {
    upload(file: File, forDisplay?: string): Answer<ImportReview, ImportError>;
    staged(): Answer<ImportReview | undefined>;
    commit(id: string, who: ImportWho): Answer<ImportResult>;
    last(): Answer<LastImport | undefined>;
    undo(id: string): Answer<void>;
  };
  webPush: {
    key(): Answer<string>;
    subscribe(subscription: PushSubscription): Answer<void>;
    unsubscribe(): Answer<void>;
  };
  auth: {
    sendCode(request: CodeRequest): Answer<void>;
    verifyCode(request: CodeVerify): Answer<SignedIn, TransportError | CodeError>;
    verifyLink(token: string): Answer<SignedIn>;
    status(): Answer<AuthStatus>;
    name(name: string): Answer<Account>;
    location(request: LocationRequest): Answer<void>;
    signout(): Answer<void>;
    signoutAll(): Answer<void>;
    deleteAccount(): Answer<void>;
  };
  upload(
    file: File,
    modifiedOn: string,
    onProgress: (percent: number) => void,
  ): Answer<StoredPhoto, UploadError>;
}
