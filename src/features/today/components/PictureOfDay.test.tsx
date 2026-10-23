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

const PROMPTS = [
  "Remember the day we camped by the lake?",
  "The first snow in the backyard",
  "Grandma’s birthday cake",
  "Our summer at the beach",
  "The first day of school",
  "Sunday pancakes, all of us",
  "Pizza night on Friday",
];

test("TODAY-07 with no photos the tile opens Photos", async () => {
  const onOpenPhotos = vi.fn<() => void>();

  render(<PictureOfDayEmpty onOpenPhotos={onOpenPhotos} canUpload />);

  await userEvent.click(screen.getByRole("button", { name: /Upload a photo/ }));

  expect(onOpenPhotos).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Share a family photo and keep the memory here.")).toBeInTheDocument();
});

test("TODAY-07 the tile shows one memory prompt and keeps it across re-renders", () => {
  const { rerender } = render(<PictureOfDayEmpty onOpenPhotos={ignore} canUpload />);

  const shown = PROMPTS.filter((prompt) => screen.queryByText(`“${prompt}”`));

  expect(shown).toHaveLength(1);

  rerender(<PictureOfDayEmpty onOpenPhotos={ignore} canUpload={false} />);

  expect(screen.getByText(`“${shown[0]}”`)).toBeInTheDocument();
});

test("TODAY-07 each mount picks its prompt at random from the seven", () => {
  const random = vi.spyOn(Math, "random");

  const picks = PROMPTS.map((_, index) => {
    random.mockReturnValueOnce((index + 0.5) / PROMPTS.length);

    const { unmount, container } = render(<PictureOfDayEmpty onOpenPhotos={ignore} canUpload />);

    const text = container.textContent;

    unmount();

    return text;
  });

  random.mockRestore();

  PROMPTS.forEach((prompt, index) => {
    expect(picks[index]).toContain(`“${prompt}”`);
  });
});

test("TODAY-07 on small the tile has no Upload a photo pill but still opens Photos", async () => {
  const onOpenPhotos = vi.fn<() => void>();

  render(<PictureOfDayEmpty onOpenPhotos={onOpenPhotos} canUpload={false} />);

  expect(screen.queryByText("Upload a photo")).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button"));

  expect(onOpenPhotos).toHaveBeenCalledTimes(1);
});
