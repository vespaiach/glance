import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PictureOfDay, PictureOfDayEmpty } from "./PictureOfDay";

const coast = {
  id: "coast",
  title: "Cannon Beach",
  takenOn: "2026-09-06",
  place: "Summer trip",
  createdAt: "2026-10-05T19:05:00.000Z",
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: true,
} as const;

test("TODAY-07 shows the photo with its title, date and place", () => {
  render(<PictureOfDay thisYear={2026} photo={coast} src="/fixtures/photos/coast.svg" />);

  expect(screen.getByText("Picture of the day")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Cannon Beach" })).toHaveAttribute(
    "src",
    "/fixtures/photos/coast.svg",
  );
  expect(screen.getByText("Cannon Beach")).toBeInTheDocument();
  expect(screen.getByText("Sep 6 · Summer trip")).toBeInTheDocument();
});

test("TODAY-07 an On this day photo names its year in the eyebrow", () => {
  render(<PictureOfDay thisYear={2026} photo={coast} onThisDay={2024} src="/coast.svg" />);

  expect(screen.getByText("On this day · 2024")).toBeInTheDocument();
  expect(screen.queryByText("Picture of the day")).not.toBeInTheDocument();
});

test("PHOTO-03 a photo with no place shows the date alone", () => {
  render(<PictureOfDay thisYear={2026} photo={{ ...coast, place: undefined }} src="/coast.svg" />);

  expect(screen.getByText("Sep 6")).toBeInTheDocument();
});

test("TODAY-07 with no photos the tile explains and Upload goes to Photos", async () => {
  const onUpload = vi.fn<() => void>();

  render(<PictureOfDayEmpty canUpload onUpload={onUpload} />);

  expect(screen.getByText("Picture of the day")).toBeInTheDocument();
  expect(screen.getByText("Appears once someone uploads a photo.")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Upload" }));

  expect(onUpload).toHaveBeenCalledTimes(1);
});

test("spec§5.4 the phone has no Upload link", () => {
  render(<PictureOfDayEmpty canUpload={false} onUpload={() => {}} />);

  expect(screen.queryByRole("button", { name: "Upload" })).not.toBeInTheDocument();
});
