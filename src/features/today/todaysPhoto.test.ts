import type { Photo } from "@/domain/schemas";
import type { UploadTile } from "@/features/photos";
import { firstUpload, momentsLine, photoText } from "./todaysPhoto";

const COAST: Photo = {
  id: "coast",
  title: "Cannon Beach",
  takenOn: "2026-09-06",
  place: "Summer trip",
  createdAt: "2026-10-05T19:05:00.000Z",
  sources: { title: "photo", takenOn: "photo", place: "photo-location" },
  checked: true,
};

const uploading = (id: string, percent: number): UploadTile => ({
  id,
  title: id,
  preview: `/${id}.svg`,
  state: "uploading",
  percent,
});

describe("photoText", () => {
  it("TODAY-07 the title, then the date · place caption", () => {
    expect(photoText(COAST, undefined, 2026)).toEqual({
      title: "Cannon Beach",
      caption: "Sep 6 · Summer trip",
      name: "Today’s photo: Cannon Beach, Sep 6, Summer trip",
    });
  });

  it("TODAY-07 a camera file name shows the place, and the caption keeps the date", () => {
    expect(photoText({ ...COAST, title: "IMG_4410" }, undefined, 2026)).toMatchObject({
      title: "Summer trip",
      caption: "Sep 6",
    });
  });

  it("TODAY-07 with no title or place the date is the title and there is no caption", () => {
    const { place: _place, ...row } = { ...COAST, title: "" };

    expect(photoText(row, undefined, 2026)).toEqual({
      title: "Sep 6",
      caption: "",
      name: "Today’s photo: Sep 6",
    });
  });

  it("TODAY-07 an On this day photo says so in the caption", () => {
    expect(photoText({ ...COAST, takenOn: "2024-10-09" }, 2024, 2026)).toMatchObject({
      caption: "On this day · 2024",
      name: "Today’s photo: Cannon Beach, On this day, 2024",
    });
  });
});

describe("firstUpload", () => {
  it("TODAY-07 no running uploads means no first upload", () => {
    expect(firstUpload([{ id: "x", title: "x", state: "failed", reason: "too-large" }])).toBe(
      undefined,
    );
  });

  it("TODAY-07 one upload shows its preview and its progress", () => {
    expect(firstUpload([uploading("a", 64)])).toEqual({
      preview: "/a.svg",
      percent: 64,
      status: "Uploading · 64%",
    });
  });

  it("TODAY-07 several uploads show their count and the average progress", () => {
    expect(firstUpload([uploading("a", 82), uploading("b", 35), uploading("c", 0)])).toEqual({
      preview: "/a.svg",
      percent: 39,
      status: "3 photos · 39%",
    });
  });

  it("TODAY-07 an upload at 0% is waiting", () => {
    expect(firstUpload([uploading("a", 0)])?.status).toBe("Waiting");
  });

  it("TODAY-07 paused uploads are paused offline", () => {
    expect(firstUpload([{ id: "a", title: "a", state: "paused", percent: 40 }])?.status).toBe(
      "Paused · offline",
    );
  });
});

describe("momentsLine", () => {
  it("TODAY-07 Oct 9 starts at a birthday cake, first letter capitalized", () => {
    expect(momentsLine("2026-10-09")).toBe(
      "A birthday cake, pizza night, the first day of school. Add family photos and one shows here each day.",
    );
  });
});
