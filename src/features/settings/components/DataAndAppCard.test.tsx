import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { DataAndAppCard } from "./DataAndAppCard";

type Props = ComponentProps<typeof DataAndAppCard>;

function renderCard(overrides: Partial<Props> = {}) {
  const props: Props = {
    online: true,
    refresh: { kind: "idle" },
    updatedMinutes: 4,
    onRefresh: vi.fn(),
    ...overrides,
  };

  render(<DataAndAppCard {...props} />);

  return props;
}

test("SET-20 the card shows Refresh data with the time since the last sync", async () => {
  const props = renderCard();

  expect(screen.getByRole("region", { name: "Data and app" })).toBeInTheDocument();
  expect(screen.getByText("Refresh data")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Updated 4 min ago");
  expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");

  await userEvent.click(screen.getByRole("button", { name: "Refresh" }));

  expect(props.onRefresh).toHaveBeenCalledOnce();
});

test("SET-20 under a minute reads Updated just now", () => {
  renderCard({ updatedMinutes: 0 });

  expect(screen.getByRole("status")).toHaveTextContent("Updated just now");
});

test("SET-20 while refreshing the button reads Refreshing and is disabled", () => {
  renderCard({ refresh: { kind: "busy" } });

  expect(screen.getByRole("button", { name: "Refreshing" })).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("Getting the latest data");
});

test("SET-20 a failed refresh says the server couldn't be reached", () => {
  renderCard({ refresh: { kind: "fail" } });

  expect(screen.getByRole("status")).toHaveTextContent("Couldn’t reach the server. Try again.");
  expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
});

test("SET-20 offline Refresh is disabled and says when it last updated", () => {
  renderCard({ online: false, refresh: { kind: "fail" } });

  expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("Offline · updated 4 min ago");
});

test("SET-20 with no sync yet the status is empty, or Offline alone", () => {
  const { unmount } = renderWithoutSync(true);

  expect(screen.getByRole("status")).toBeEmptyDOMElement();

  unmount();

  renderWithoutSync(false);

  expect(screen.getByRole("status")).toHaveTextContent(/^Offline$/);
});

function renderWithoutSync(online: boolean) {
  return render(<DataAndAppCard online={online} refresh={{ kind: "idle" }} onRefresh={vi.fn()} />);
}
