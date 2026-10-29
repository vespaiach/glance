import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { Button } from "@/ui/Button";
import type { ReloadAppRow } from "../useReloadApp";
import { DataAndAppCard } from "./DataAndAppCard";

type Props = ComponentProps<typeof DataAndAppCard>;

function reloadRow(overrides: Partial<ReloadAppRow> = {}): ReloadAppRow {
  return {
    current: "3.2.0",
    reload: { kind: "idle" },
    onAsk: vi.fn(),
    onCancel: vi.fn(),
    onReload: vi.fn(),
    ...overrides,
  };
}

function renderCard(overrides: Partial<Props> = {}) {
  const props: Props = {
    online: true,
    refresh: { kind: "idle" },
    updatedMinutes: 4,
    onRefresh: vi.fn(),
    reloadApp: reloadRow(),
    ...overrides,
  };

  render(<DataAndAppCard {...props} />);

  return props;
}

function refreshStatus() {
  return screen.getAllByRole("status")[0];
}

function reloadStatus() {
  return screen.getAllByRole("status")[1];
}

test("SET-20 the card shows Refresh data with the time since the last sync", async () => {
  const props = renderCard();

  expect(screen.getByRole("region", { name: "Data and app" })).toBeInTheDocument();
  expect(screen.getByText("Refresh data")).toBeInTheDocument();
  expect(refreshStatus()).toHaveTextContent("Updated 4 min ago");
  expect(refreshStatus()).toHaveAttribute("aria-live", "polite");

  await userEvent.click(screen.getByRole("button", { name: "Refresh" }));

  expect(props.onRefresh).toHaveBeenCalledOnce();
});

test("SET-20 under a minute reads Updated just now", () => {
  renderCard({ updatedMinutes: 0 });

  expect(refreshStatus()).toHaveTextContent("Updated just now");
});

test("SET-20 while refreshing the button reads Refreshing and is disabled", () => {
  renderCard({ refresh: { kind: "busy" } });

  expect(screen.getByRole("button", { name: "Refreshing" })).toBeDisabled();
  expect(refreshStatus()).toHaveTextContent("Getting the latest data");
});

test("SET-20 a failed refresh says the server couldn't be reached", () => {
  renderCard({ refresh: { kind: "fail" } });

  expect(refreshStatus()).toHaveTextContent("Couldn’t reach the server. Try again.");
  expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
});

test("SET-20 offline Refresh is disabled and says when it last updated", () => {
  renderCard({ online: false, refresh: { kind: "fail" } });

  expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
  expect(refreshStatus()).toHaveTextContent("Offline · updated 4 min ago");
});

test("SET-20 with no sync yet the status is empty, or Offline alone", () => {
  const { unmount } = renderWithoutSync(true);

  expect(refreshStatus()).toBeEmptyDOMElement();

  unmount();

  renderWithoutSync(false);

  expect(refreshStatus()).toHaveTextContent(/^Offline$/);
});

test("SET-21 the same version on the server reads up to date", () => {
  renderCard({ reloadApp: reloadRow({ next: "3.2.0" }) });

  expect(screen.getByText("Reload app")).toBeInTheDocument();
  expect(reloadStatus()).toHaveTextContent("Version 3.2.0 · up to date");
});

test("SET-21 a newer server version is ready and the button turns primary", () => {
  renderCard({ reloadApp: reloadRow({ next: "3.3.0" }) });

  expect(reloadStatus()).toHaveTextContent("Version 3.3.0 is ready · this screen runs 3.2.0");

  const reload = screen.getByRole("button", { name: "Reload" });

  const { container } = render(<Button variant="primary">Reload</Button>);

  expect(reload.className).toBe(container.querySelector("button")?.className);
});

test("SET-21 Reload asks first, then Cancel or Reload now answers", async () => {
  const reloadApp = reloadRow({ reload: { kind: "asking" } });
  renderCard({ reloadApp });

  expect(
    screen.getByText("The screen goes blank for a few seconds, then opens on Today."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Reload" })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await userEvent.click(screen.getByRole("button", { name: "Reload now" }));

  expect(reloadApp.onCancel).toHaveBeenCalledOnce();
  expect(reloadApp.onReload).toHaveBeenCalledOnce();
});

test("SET-21 a tap on Reload asks", async () => {
  const reloadApp = reloadRow();
  renderCard({ reloadApp });

  await userEvent.click(screen.getByRole("button", { name: "Reload" }));

  expect(reloadApp.onAsk).toHaveBeenCalledOnce();
});

test("SET-21 while reloading the screen is covered with the version it loads", () => {
  renderCard({ reloadApp: reloadRow({ next: "3.3.0", reload: { kind: "reloading" } }) });

  const cover = screen.getByRole("alert");

  expect(cover).toHaveAttribute("aria-busy", "true");
  expect(cover).toHaveTextContent("Reloading Glance");
  expect(cover).toHaveTextContent(
    "Getting the latest version from the server. This takes a few seconds.",
  );
  expect(cover).toHaveTextContent("Version 3.3.0");
});

test("SET-21 offline Reload is disabled and needs a connection", () => {
  renderCard({ online: false, reloadApp: reloadRow({ next: "3.3.0" }) });

  expect(screen.getByRole("button", { name: "Reload" })).toBeDisabled();
  expect(reloadStatus()).toHaveTextContent("Offline · needs a connection");
});

function renderWithoutSync(online: boolean) {
  return render(
    <DataAndAppCard
      online={online}
      refresh={{ kind: "idle" }}
      onRefresh={vi.fn()}
      reloadApp={reloadRow()}
    />,
  );
}
