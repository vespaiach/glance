import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import type { Photo } from "@/domain/schemas";
import { FullScreenPhoto } from "./FullScreenPhoto";

const COAST: Photo = {
  id: "0195f0a0-0000-7000-8000-000000000003",
  title: "Cannon Beach",
  takenOn: "2025-09-06",
  place: "Summer trip",
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: true,
  createdAt: "2026-10-05T19:00:00.000Z",
};

type Props = ComponentProps<typeof FullScreenPhoto>;

function renderFull(overrides: Partial<Props> = {}) {
  const props: Props = {
    photo: COAST,
    src: "/coast.jpg",
    index: 1,
    total: 6,
    thisYear: 2026,
    playing: true,
    chrome: true,
    onExit: vi.fn<() => void>(),
    onToggleChrome: vi.fn<() => void>(),
    onStep: vi.fn<(delta: number) => void>(),
    onTogglePlay: vi.fn<() => void>(),
    ...overrides,
  };

  render(<FullScreenPhoto {...props} />);

  return props;
}

test("PHOTO-14 is a dialog named after the photo with its count, name, date and place", () => {
  renderFull();

  const dialog = screen.getByRole("dialog", { name: "Cannon Beach · full screen" });

  expect(within(dialog).getByText("2 of 6")).toBeInTheDocument();
  expect(within(dialog).getByText("Cannon Beach")).toBeInTheDocument();
  expect(within(dialog).getByText("Sep 6, 2025 · Summer trip")).toBeInTheDocument();
  expect(within(dialog).getByRole("img", { name: "Cannon Beach" })).toHaveAttribute(
    "src",
    "/coast.jpg",
  );
});

test("PHOTO-14 has Exit, Previous, Pause and Next but no edit button", () => {
  renderFull();

  expect(
    screen.getAllByRole("button", { name: /photo|slideshow|full screen/ }).map((b) => b.ariaLabel),
  ).toEqual(["Exit full screen", "Previous photo", "Pause slideshow", "Next photo"]);
  expect(screen.queryByRole("button", { name: "Edit photo details" })).not.toBeInTheDocument();
});

test("PHOTO-14 the controls call back: Exit, the chevrons and Play", async () => {
  const props = renderFull({ playing: false });

  await userEvent.click(screen.getByRole("button", { name: "Previous photo" }));
  await userEvent.click(screen.getByRole("button", { name: "Next photo" }));
  await userEvent.click(screen.getByRole("button", { name: "Play slideshow" }));
  await userEvent.click(screen.getByRole("button", { name: "Exit full screen" }));

  expect(vi.mocked(props.onStep).mock.calls).toEqual([[-1], [1]]);
  expect(props.onTogglePlay).toHaveBeenCalledOnce();
  expect(props.onExit).toHaveBeenCalledOnce();
  expect(props.onToggleChrome).not.toHaveBeenCalled();
});

test("PHOTO-14 tapping the photo toggles the rows", async () => {
  const props = renderFull();

  await userEvent.click(screen.getByRole("img", { name: "Cannon Beach" }));

  expect(props.onToggleChrome).toHaveBeenCalledOnce();
});

test("PHOTO-14 with the rows hidden only the photo shows", () => {
  renderFull({ chrome: false });

  expect(screen.getByRole("dialog", { name: "Cannon Beach · full screen" })).toBeInTheDocument();
  expect(screen.queryByText("2 of 6")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Cannon Beach" })).toBeInTheDocument();
});

test("PHOTO-14 Esc exits, ← → step and Space plays or pauses", async () => {
  const props = renderFull({ chrome: false });

  await userEvent.keyboard("{ArrowLeft}{ArrowRight}{ArrowRight}[Space]{Escape}");

  expect(vi.mocked(props.onStep).mock.calls).toEqual([[-1], [1], [1]]);
  expect(props.onTogglePlay).toHaveBeenCalledOnce();
  expect(props.onExit).toHaveBeenCalledOnce();
});

test("PHOTO-14 Space on a focused control doesn't also press it", async () => {
  const props = renderFull();

  screen.getByRole("button", { name: "Next photo" }).focus();

  await userEvent.keyboard("[Space]");

  expect(props.onTogglePlay).toHaveBeenCalledOnce();
  expect(props.onStep).not.toHaveBeenCalled();
});
