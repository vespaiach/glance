import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type Harness, openHarness, synced } from "@/data/repos/testHarness";
import type { ImportReview } from "@/domain/imports";
import { err, ok } from "@/domain/result";
import type { Tag } from "@/domain/schemas";
import { NetworkProvider } from "@/shell/providers/network";
import { SeasonProvider } from "@/shell/providers/season";
import { shellWrapper } from "@/shell/providers/testShell";
import { TimeZoneProvider } from "@/shell/providers/timeZone";
import { ImportScreen } from "./ImportScreen";

const navigation = vi.hoisted(() => ({
  push: vi.fn<(path: string) => void>(),
  replace: vi.fn<(path: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
}));

const NOW = new Date("2026-10-29T17:00:00.000Z");

const MIA: Tag = {
  id: "0195f0a0-0000-7000-8000-0000000000a1",
  name: "Mia",
  color: "pink",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const REVIEW: ImportReview = {
  id: "imp-1",
  fileName: "soccer.ics",
  size: 12_288,
  range: { first: "2026-10-31", last: "2026-12-12" },
  events: [
    {
      title: "U10 game",
      startAt: "2026-10-31T16:00:00.000Z",
      endAt: "2026-10-31T17:00:00.000Z",
      duplicate: false,
    },
    {
      title: "Practice",
      startAt: "2026-11-03T17:30:00.000Z",
      endAt: "2026-11-03T18:30:00.000Z",
      duplicate: true,
    },
    {
      title: "Picture day",
      startAt: "2026-11-21T00:00:00.000Z",
      allDay: true,
      duplicate: false,
    },
  ],
  newCount: 2,
  duplicates: 1,
};

const LAST = {
  id: "imp-0",
  importedAt: "2026-10-28T17:00:00.000Z",
  count: 16,
  who: "everyone",
  undoUntil: "2026-10-29T18:00:00.000Z",
};

const ICS = new File(["BEGIN:VCALENDAR"], "soccer.ics", { type: "text/calendar" });

let store: Harness;

beforeEach(async () => {
  store = openHarness("glance-import-screen-test");

  navigation.push.mockReset();
  navigation.replace.mockReset();

  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

  await store.db.tags.put(synced(MIA));
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();

  await store.close();
});

function renderImport() {
  const Shell = shellWrapper(store, { frozenAt: NOW });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Shell>
      <NetworkProvider>
        <TimeZoneProvider>
          <SeasonProvider>{children}</SeasonProvider>
        </TimeZoneProvider>
      </NetworkProvider>
    </Shell>
  );

  return render(<ImportScreen />, { wrapper });
}

async function pickFile() {
  store.imports.upload.mockResolvedValue(ok(REVIEW));

  renderImport();

  await userEvent.upload(await screen.findByLabelText("Choose file"), ICS);
}

test("IMP-06 picking a file uploads it and shows its review", async () => {
  await pickFile();

  expect(await screen.findByRole("heading", { name: "3 events found" })).toBeInTheDocument();
  expect(store.imports.upload).toHaveBeenCalledWith(ICS, undefined);
  expect(screen.getByText("soccer.ics")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Import 2 events" })).toBeInTheDocument();
});

test("IMP-06 a file that isn't a calendar shows This isn’t a calendar file", async () => {
  store.imports.upload.mockResolvedValue(err("not-ics"));

  renderImport();

  await userEvent.upload(await screen.findByLabelText("Choose file"), ICS);

  expect(await screen.findByText("This isn’t a calendar file")).toBeInTheDocument();
});

test("IMP-06 a file with only past events shows No upcoming events in this file", async () => {
  store.imports.upload.mockResolvedValue(err("no-upcoming"));

  renderImport();

  await userEvent.upload(await screen.findByLabelText("Choose file"), ICS);

  expect(await screen.findByText("No upcoming events in this file")).toBeInTheDocument();
});

test("IMP-08 Import commits for the picked person, shows the events added and syncs them in", async () => {
  store.imports.commit.mockResolvedValue(ok({ count: 2, range: REVIEW.range, who: MIA.id }));
  await pickFile();

  await userEvent.click(await screen.findByRole("radio", { name: "Mia" }));
  await userEvent.click(screen.getByRole("button", { name: "Import 2 events" }));

  expect(await screen.findByText("2 events added")).toBeInTheDocument();
  expect(store.imports.commit).toHaveBeenCalledWith("imp-1", MIA.id);
  expect(screen.getByText("For Mia · Oct 31 – Dec 12. 1 duplicate skipped.")).toBeInTheDocument();
  expect(store.nudge).toHaveBeenCalled();
});

test("IMP-08 offline at Import shows Couldn’t import and adds nothing", async () => {
  await pickFile();
  await screen.findByRole("button", { name: "Import 2 events" });

  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  window.dispatchEvent(new Event("offline"));
  await userEvent.click(screen.getByRole("button", { name: "Import 2 events" }));

  expect(await screen.findByText("Couldn’t import")).toBeInTheDocument();
  expect(store.imports.commit).not.toHaveBeenCalled();
});

test("IMP-08 a failed commit shows Couldn’t import, and Try again returns to the review", async () => {
  store.imports.commit.mockResolvedValue(err("server"));
  await pickFile();

  await userEvent.click(await screen.findByRole("button", { name: "Import 2 events" }));
  await userEvent.click(await screen.findByRole("button", { name: "Try again" }));

  expect(await screen.findByRole("button", { name: "Import 2 events" })).toBeInTheDocument();
});

async function imported() {
  store.imports.commit.mockResolvedValue(ok({ count: 2, range: REVIEW.range, who: "everyone" }));
  store.imports.undo.mockResolvedValue(ok(undefined));
  await pickFile();

  await userEvent.click(await screen.findByRole("button", { name: "Import 2 events" }));
  await screen.findByText("2 events added");
}

test("IMP-09 Undo import removes this import's events and closes to Settings", async () => {
  await imported();

  await userEvent.click(screen.getByRole("button", { name: "Undo import" }));

  expect(store.imports.undo).toHaveBeenCalledWith("imp-1");
  await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/settings"));
});

test("IMP-09 Open calendar closes to Calendar", async () => {
  await imported();

  await userEvent.click(screen.getByRole("button", { name: "Open calendar" }));

  await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/calendar"));
});

test("IMP-03 Back to settings goes to Settings", async () => {
  renderImport();

  await userEvent.click(await screen.findByRole("button", { name: "Back to settings" }));

  await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/settings"));
});

test("IMP-10 Source's Undo removes the last import and hides its tile", async () => {
  store.imports.last.mockResolvedValue(ok(LAST));
  store.imports.undo.mockResolvedValue(ok(undefined));

  renderImport();

  expect(await screen.findByText("Last import · Oct 28")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Undo" }));

  expect(store.imports.undo).toHaveBeenCalledWith("imp-0");
  await waitFor(() => expect(screen.queryByText("Last import · Oct 28")).not.toBeInTheDocument());
});

test("IMP-10 offline Source hides Undo", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  store.imports.last.mockResolvedValue(ok(LAST));

  renderImport();

  expect(await screen.findByText("Last import · Oct 28")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
});

const CODE = "https://glance.example.com/api/auth/verify?t=1&to=import";

async function waitingForPhone() {
  vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true });
  store.issueQr.mockResolvedValue(ok({ url: CODE }));
  store.voidQr.mockResolvedValue(ok(undefined));
  store.imports.staged.mockResolvedValue(ok(undefined));

  renderImport();

  await userEvent.click(await screen.findByRole("button", { name: /Send from phone/ }));
  await screen.findByText("Waiting for a file · code ends in 10:00");
}

async function poll() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
}

test("IMP-04 Send from phone shows a 10-minute import code and waits for a file", async () => {
  await waitingForPhone();

  expect(store.issueQr).toHaveBeenCalledWith("import");
  await poll();

  expect(store.imports.staged).toHaveBeenCalled();
  expect(screen.getByText(/Waiting for a file/)).toBeInTheDocument();
});

test("IMP-04 the phone's file moves this screen to its review", async () => {
  await waitingForPhone();

  store.imports.staged.mockResolvedValue(ok(REVIEW));
  await poll();

  expect(await screen.findByRole("heading", { name: "3 events found" })).toBeInTheDocument();
  expect(store.voidQr).toHaveBeenCalledWith(CODE);
});

test("IMP-04 New code asks for a new import code", async () => {
  await waitingForPhone();

  await userEvent.click(screen.getByRole("button", { name: "New code" }));

  await waitFor(() => expect(store.issueQr).toHaveBeenCalledTimes(2));
  expect(store.issueQr).toHaveBeenLastCalledWith("import");
});

test("IMP-04 waiting ignores the file this screen chose itself", async () => {
  vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true });
  store.issueQr.mockResolvedValue(ok({ url: CODE }));
  store.imports.staged.mockResolvedValue(ok(REVIEW));
  await pickFile();
  await userEvent.click(await screen.findByRole("button", { name: "Change" }));

  await userEvent.click(await screen.findByRole("button", { name: /Send from phone/ }));
  await poll();

  expect(screen.getByText(/Waiting for a file/)).toBeInTheDocument();
});

test("IMP-04 a phone opened from the code uploads its file for the issuing screen", async () => {
  window.history.replaceState(null, "", "/settings/import?forDisplay=wall-1");

  await pickFile();

  expect(store.imports.upload).toHaveBeenCalledWith(ICS, "wall-1");
  window.history.replaceState(null, "", "/");
});
