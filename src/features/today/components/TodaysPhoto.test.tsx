import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import type { Photo } from "@/domain/schemas";
import { type ShownPhoto, TodaysPhoto } from "./TodaysPhoto";

const COAST: Photo = {
  id: "coast",
  title: "Cannon Beach",
  takenOn: "2026-09-06",
  place: "Summer trip",
  createdAt: "2026-10-05T19:05:00.000Z",
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: true,
};

const SHOWN: ShownPhoto = {
  photo: COAST,
  src: "/fixtures/photos/coast.svg",
  text: {
    title: "Cannon Beach",
    caption: "Sep 6 · Summer trip",
    name: "Today’s photo: Cannon Beach, Sep 6, Summer trip",
  },
  others: ["a", "b", "c", "d"].map((id) => ({ id, src: `/${id}.svg` })),
};

const MOMENTS = "A birthday cake, pizza night, the first day of school. Add family photos.";

type Props = ComponentProps<typeof TodaysPhoto>;

function renderPhoto(props: Partial<Props> = {}) {
  const handlers = {
    onAdd: vi.fn<() => void>(),
    onChooseFiles: vi.fn<() => void>(),
    onCloseQr: vi.fn<() => void>(),
    onOpen: vi.fn<(id: string) => void>(),
    onOpenPhotos: vi.fn<() => void>(),
  };

  const view = render(
    <TodaysPhoto
      state={{ kind: "ready", data: [SHOWN] }}
      online
      fromPhone={false}
      moments={MOMENTS}
      {...handlers}
      {...props}
    />,
  );

  return { ...view, ...handlers };
}

test("TODAY-07 the photo is one button named with its title and caption, showing both", async () => {
  const { container, onOpen } = renderPhoto();

  const button = screen.getByRole("button", {
    name: "Today’s photo: Cannon Beach, Sep 6, Summer trip",
  });

  expect(screen.getByText("Today’s photo")).toBeInTheDocument();
  expect(within(button).getByText("Cannon Beach")).toBeInTheDocument();
  expect(within(button).getByText("Sep 6 · Summer trip")).toBeInTheDocument();
  expect(container.querySelector("img")).toHaveAttribute("src", "/fixtures/photos/coast.svg");

  await userEvent.click(button);

  expect(onOpen).toHaveBeenCalledWith("coast");
});

test("TODAY-07 with other photos the more row counts them, shows up to 3 thumbnails and opens Photos", async () => {
  const { onOpenPhotos } = renderPhoto();

  const row = screen.getByRole("button", { name: "4 more photos, open Photos" });

  expect(row).toHaveTextContent("4 more photos");
  expect(row.querySelectorAll("img")).toHaveLength(3);
  expect(screen.queryByRole("button", { name: "All photos" })).not.toBeInTheDocument();

  await userEvent.click(row);

  expect(onOpenPhotos).toHaveBeenCalledTimes(1);
});

test("TODAY-07 with no other photo the header has All photos instead of the more row", async () => {
  const { onOpenPhotos } = renderPhoto({
    state: { kind: "ready", data: [{ ...SHOWN, others: [] }] },
  });

  expect(screen.queryByRole("button", { name: /more photo/ })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "All photos" }));

  expect(onOpenPhotos).toHaveBeenCalledTimes(1);
});

test("TODAY-07 one other photo is 1 more photo", () => {
  renderPhoto({ state: { kind: "ready", data: [{ ...SHOWN, others: [{ id: "a", src: "/a" }] }] } });

  expect(screen.getByRole("button", { name: "1 more photo, open Photos" })).toBeInTheDocument();
});

test("TODAY-07 Add photo in the header asks to add", async () => {
  const { onAdd } = renderPhoto();

  await userEvent.click(screen.getByRole("button", { name: "Add photo" }));

  expect(onAdd).toHaveBeenCalledTimes(1);
});

test("TODAY-07 loading is a pulsing frame with no header buttons", () => {
  renderPhoto({ state: { kind: "loading" } });

  expect(screen.getByRole("status", { name: "Loading today’s photo" })).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("TODAY-07 with no photos the tile shows the moments and adds photos", async () => {
  const { onAdd } = renderPhoto({ state: { kind: "empty" } });

  expect(screen.getByText("A memory to share?")).toBeInTheDocument();
  expect(screen.getByText(MOMENTS)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add photo" })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Add photos" }));

  expect(onAdd).toHaveBeenCalledTimes(1);
});

test("TODAY-07 on large the empty tile adds from your phone", () => {
  renderPhoto({ state: { kind: "empty" }, fromPhone: true });

  const tile = screen.getByRole("button", { name: "Add photos from your phone" });

  expect(tile).toHaveTextContent("Add from your phone");
});

test("TODAY-07 the first upload shows its progress and status and opens Photos", async () => {
  const { container, onOpenPhotos } = renderPhoto({
    state: { kind: "empty" },
    upload: { preview: "/orchard.svg", percent: 64, status: "Uploading · 64%" },
  });

  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "64");
  expect(screen.getByText("Your first photo is on its way")).toBeInTheDocument();
  expect(screen.getByText("Uploading · 64%")).toBeInTheDocument();
  expect(container.querySelector("img")).toHaveAttribute("src", "/orchard.svg");
  expect(screen.queryByText("A memory to share?")).not.toBeInTheDocument();

  await userEvent.click(
    screen.getByRole("button", { name: "First photo uploading, 64%. Open Photos" }),
  );

  expect(onOpenPhotos).toHaveBeenCalledTimes(1);
});

test("TODAY-07 a photo that didn't load says so and keeps its title and caption", () => {
  const { container } = renderPhoto();

  fireEvent.error(container.querySelector("img") as HTMLImageElement);

  expect(screen.getByText("Photo didn’t load")).toBeInTheDocument();
  expect(screen.getByText("Cannon Beach")).toBeInTheDocument();
  expect(screen.getByText("Sep 6 · Summer trip")).toBeInTheDocument();
});

test("TODAY-07 offline a photo with no saved copy shows when back online", () => {
  renderPhoto({ online: false, defaultFailed: true });

  expect(screen.getByText("Shows when back online")).toBeInTheDocument();
});

test("TODAY-07 Add from your phone shows the code, chooses files or closes, with no header buttons", async () => {
  const { onChooseFiles, onCloseQr } = renderPhoto({ qr: { url: "https://glance.test/qr" } });

  const panel = screen.getByRole("group", { name: "Add photos from your phone" });

  expect(within(panel).getByText("Scan to add photos")).toBeInTheDocument();
  expect(
    within(panel).getByRole("img", { name: "Code to add photos from your phone" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add photo" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Today’s photo/ })).not.toBeInTheDocument();

  await userEvent.click(within(panel).getByRole("button", { name: "Choose files here" }));
  await userEvent.click(within(panel).getByRole("button", { name: "Done" }));

  expect(onChooseFiles).toHaveBeenCalledTimes(1);
  expect(onCloseQr).toHaveBeenCalledTimes(1);
});
