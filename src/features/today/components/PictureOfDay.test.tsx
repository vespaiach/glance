import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PictureOfDay, PictureOfDayEmpty, PictureOfDayPanel } from "./PictureOfDay";

const coast = {
  id: "coast",
  title: "Cannon Beach",
  takenOn: "2026-09-06",
  place: "Summer trip",
  createdAt: "2026-10-05T19:05:00.000Z",
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: true,
} as const;

const ignore = () => {};

test("TODAY-07 the picture of the day is a button named with its title, showing the photo and its title", () => {
  const { container } = render(
    <PictureOfDay photo={coast} src="/fixtures/photos/coast.svg" onOpen={ignore} />,
  );

  const button = screen.getByRole("button", { name: "Picture of the day: Cannon Beach" });

  expect(button).toHaveTextContent(/^Cannon Beach$/);
  expect(container.querySelector("img")).toHaveAttribute("src", "/fixtures/photos/coast.svg");
  expect(screen.queryByText("Sep 6 · Summer trip")).not.toBeInTheDocument();
});

test("TODAY-07 tapping the picture of the day opens it", async () => {
  const onOpen = vi.fn<() => void>();

  render(<PictureOfDay photo={coast} src="/coast.svg" onOpen={onOpen} />);

  await userEvent.click(screen.getByRole("button", { name: "Picture of the day: Cannon Beach" }));

  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("TODAY-07 the panel has the Picture of the day eyebrow and All photos", async () => {
  const onOpenPhotos = vi.fn<() => void>();

  render(<PictureOfDayPanel onOpenPhotos={onOpenPhotos}>photo</PictureOfDayPanel>);

  expect(screen.getByText("Picture of the day")).toBeInTheDocument();
  expect(screen.getByText("photo")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "All photos" }));

  expect(onOpenPhotos).toHaveBeenCalledTimes(1);
});

test("TODAY-07 an On this day photo names its year in the panel eyebrow", () => {
  render(
    <PictureOfDayPanel onThisDay={2024} onOpenPhotos={ignore}>
      photo
    </PictureOfDayPanel>,
  );

  expect(screen.getByText("On this day · 2024")).toBeInTheDocument();
  expect(screen.queryByText("Picture of the day")).not.toBeInTheDocument();
});

test("TODAY-07 with no photos the tile reads Upload a photo and tapping it uploads", async () => {
  const onUpload = vi.fn<() => void>();

  render(<PictureOfDayEmpty onUpload={onUpload} />);

  const button = screen.getByRole("button", { name: "Upload a photo" });

  await userEvent.click(button);

  expect(onUpload).toHaveBeenCalledTimes(1);
});
