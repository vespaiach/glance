"use client";

import { useRouter } from "next/navigation";
import { useReducer, useState } from "react";
import { copy } from "@/copy";
import {
  useAccount,
  useAccountCounts,
  useDeleteAccount,
  useLastImport,
  useLiveEvents,
  usePhotos,
  usePhotoUsage,
  useSettingsRepo,
  useSignedInScreens,
  useSignOut,
  useSignOutAll,
  useTags,
  useTagsRepo,
} from "@/data/repos";
import { shownBackground } from "@/domain/background";
import { exportableEvents, toIcs } from "@/domain/exportEvents";
import { formatMonthDay } from "@/domain/time";
import { useBreakpoint } from "@/shell/breakpoint";
import { useNetwork } from "@/shell/providers/network";
import { useNow } from "@/shell/providers/now";
import { useSeason } from "@/shell/providers/season";
import { useAccountSettings } from "@/shell/providers/settings";
import { useTimeZone } from "@/shell/providers/timeZone";
import { SettingsView } from "./components/SettingsView";
import { DELETE_CLOSED, deleteAccountDialog } from "./deleteAccountDialog";
import { members } from "./members";
import { SIGN_OUT_CLOSED, signOutDialog } from "./signOutDialog";
import { useApiKeyRow } from "./useApiKeyRow";
import { useQrTile } from "./useQrTile";
import { useRefreshData } from "./useRefreshData";
import { useThisPhone } from "./useThisPhone";

const BACKGROUND_PATH = "/settings/background";

const LOCATION_PATH = "/settings/location";

const AMBIENT_PATH = "/settings/ambient";

const IMPORT_PATH = "/settings/import";

const SIGN_IN_PATH = "/signin";

const REVOKE_AFTER_MS = 1000;

const SIGNED_OUT_ALL_PATH = "/signin?toast=signed-out-all";

const ACCOUNT_DELETED_PATH = "/signin?toast=account-deleted";

export function SettingsScreen() {
  const router = useRouter();

  const breakpoint = useBreakpoint();

  const account = useAccount();

  const settings = useAccountSettings();

  const season = useSeason();

  const photos = usePhotos();

  const now = useNow("minute");

  const tz = useTimeZone();

  const repo = useSettingsRepo();

  const signOut = useSignOut();

  const signOutAll = useSignOutAll();

  const [signOutState, dispatchSignOut] = useReducer(signOutDialog, SIGN_OUT_CLOSED);

  const signOutEverywhere = async () => {
    dispatchSignOut({ type: "sign-out-all" });

    const answer = await signOutAll();

    if (answer.ok) router.replace(SIGNED_OUT_ALL_PATH);
    else dispatchSignOut({ type: "failed" });
  };

  const deleteAccount = useDeleteAccount();

  const [deleteState, dispatchDelete] = useReducer(deleteAccountDialog, DELETE_CLOSED);

  const eraseAccount = async () => {
    dispatchDelete({ type: "confirm" });

    const answer = await deleteAccount();

    if (answer.ok) router.replace(ACCOUNT_DELETED_PATH);
    else dispatchDelete({ type: "failed" });
  };

  const counts = useAccountCounts();

  const screens = useSignedInScreens();

  const storage = usePhotoUsage();

  const { online } = useNetwork();

  const qr = useQrTile();

  const thisPhone = useThisPhone();

  const lastImport = useLastImport();

  const apiKey = useApiKeyRow(online, now, tz);

  const refreshData = useRefreshData(now);

  const tags = useTags();

  const events = useLiveEvents();

  const tagsRepo = useTagsRepo();

  const [askingMember, setAskingMember] = useState<string | null>(null);

  const [savedEvents, setSavedEvents] = useState<number>();

  const upcoming = exportableEvents(events ?? [], now, tz);

  const exportEvents = () => {
    saveFile(
      copy.settings.exportEvents.fileName,
      toIcs(upcoming, tags ?? [], now, tz, copy.settings.exportEvents),
    );

    setSavedEvents(upcoming.length);
  };

  const removeMember = (id: string) => {
    setAskingMember(null);

    void tagsRepo.remove(id);
  };

  return (
    <SettingsView
      account={account}
      screens={screens}
      storage={storage}
      now={now}
      tz={tz}
      settings={settings}
      season={season}
      background={shownBackground(settings.background, photos ?? [], now, tz, season)}
      breakpoint={breakpoint}
      online={online}
      qr={qr}
      onShowQr={qr.show}
      onCloseQr={qr.close}
      onChange={(change) => repo.update(change)}
      onOpenBackground={() => router.push(BACKGROUND_PATH)}
      onOpenLocation={() => router.push(LOCATION_PATH)}
      lastImport={
        online && lastImport ? formatMonthDay(new Date(lastImport.importedAt), tz) : undefined
      }
      onOpenImport={() => router.push(IMPORT_PATH)}
      upcomingEvents={upcoming.length}
      savedEvents={savedEvents}
      onExportEvents={exportEvents}
      apiKey={apiKey}
      onOpenAmbient={() => router.push(AMBIENT_PATH)}
      signOut={signOutState}
      onSignOut={() => dispatchSignOut({ type: "open" })}
      onSignOutThisDevice={() => void signOut().then(() => router.replace(SIGN_IN_PATH))}
      onSignOutAll={() => void signOutEverywhere()}
      onCancelSignOut={() => dispatchSignOut({ type: "cancel" })}
      deleteAccount={deleteState}
      counts={counts}
      onDeleteAccount={() => dispatchDelete({ type: "open" })}
      onToggleDeleteAccount={() => dispatchDelete({ type: "toggle" })}
      onConfirmDeleteAccount={() => void eraseAccount()}
      onCancelDeleteAccount={() => dispatchDelete({ type: "cancel" })}
      phone={thisPhone.phone}
      onAllowPush={thisPhone.allow}
      onTurnOffPush={thisPhone.turnOff}
      members={tags && events && members(tags, events)}
      askingMember={askingMember}
      onAskRemoveMember={setAskingMember}
      onCancelRemoveMember={() => setAskingMember(null)}
      onRemoveMember={removeMember}
      refreshData={refreshData}
    />
  );
}

function saveFile(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar" }));

  const link = Object.assign(document.createElement("a"), { href: url, download: name });

  link.click();

  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}
