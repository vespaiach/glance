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

const ignore = () => {};

test("TODAY-07 the picture of the day is a button named with its title, showing the thumb, label and title", () => {
  const { container } = render(
    <PictureOfDay photo={coast} src="/fixtures/photos/coast.svg" onOpen={ignore} />,
  );

  const button = screen.getByRole("button", { name: "Picture of the day: Cannon Beach" });

  expect(button).toHaveTextContent(/^Picture of the dayCannon Beach$/);
  expect(container.querySelector("img")).toHaveAttribute("src", "/fixtures/photos/coast.svg");
  expect(screen.queryByText("Sep 6 · Summer trip")).not.toBeInTheDocument();
});

test("TODAY-07 tapping the picture of the day opens it", async () => {
  const onOpen = vi.fn<() => void>();

  render(<PictureOfDay photo={coast} src="/coast.svg" onOpen={onOpen} />);

  await userEvent.click(screen.getByRole("button", { name: "Picture of the day: Cannon Beach" }));

  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("TODAY-07 an On this day photo names its year in the label", () => {
  render(<PictureOfDay photo={coast} onThisDay={2024} src="/coast.svg" onOpen={ignore} />);

  expect(screen.getByText("On this day · 2024")).toBeInTheDocument();
  expect(screen.queryByText("Picture of the day")).not.toBeInTheDocument();
});

test("TODAY-07 with no photos the slot reads Upload a photo and tapping it uploads", async () => {
  const onUpload = vi.fn<() => void>();

  render(<PictureOfDayEmpty onUpload={onUpload} />);

  const button = screen.getByRole("button", { name: /Upload a photo/ });

  expect(button).toHaveTextContent(/^Picture of the dayUpload a photo$/);
  expect(screen.queryByText("Appears once someone uploads a photo.")).not.toBeInTheDocument();

  await userEvent.click(button);

  expect(onUpload).toHaveBeenCalledTimes(1);
});
