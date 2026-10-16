import { dateFromFile, nameFromFile, type PhotoFacts, photoDetails } from "./photoName";

describe("nameFromFile", () => {
  it.each([
    ["halloween-costumes-2025-10-31.jpg", "Halloween costumes"],
    ["Beach day.jpg", "Beach day"],
    ["summer_bbq_2.jpeg", "Summer bbq"],
    ["IMG_2041 Mia birthday.jpg", "Mia birthday"],
    ["Grandma’s garden.HEIC", "Grandma’s garden"],
    ["Pumpkin.patch.final.png", "Pumpkin patch"],
    ["first day of school (1).jpg", "First day of school"],
  ])("PHOTO-10 reads %s as %s", (fileName, name) => {
    expect(nameFromFile(fileName)).toBe(name);
  });

  it.each([
    "IMG_4410.JPG",
    "PXL_20260816_201512345.jpg",
    "DSC01234.jpg",
    "DSCN_0042.JPG",
    "Screenshot 2026-01-02 at 10.11.12 AM.png",
    "WhatsApp Image 2024-05-01 at 9.41.03 PM.jpeg",
    "20251031_123456.jpg",
    "a1b2c3d4.jpg",
    "Ab 12.jpg",
  ])("PHOTO-10 finds no name in %s", (fileName) => {
    expect(nameFromFile(fileName)).toBeUndefined();
  });
});

describe("dateFromFile", () => {
  it.each([
    ["halloween-costumes-2025-10-31.jpg", "2025-10-31"],
    ["PXL_20260816_201512345.jpg", "2026-08-16"],
    ["IMG_20240229_090000.jpg", "2024-02-29"],
    ["scan 1999_12_31.png", "1999-12-31"],
  ])("PHOTO-10 reads the date in %s as %s", (fileName, date) => {
    expect(dateFromFile(fileName)).toBe(date);
  });

  it.each([
    "IMG_4410.JPG",
    "2025-13-01.jpg",
    "2025-02-30.jpg",
    "20230229.jpg",
    "2025-10_31.jpg",
    "123420251031.jpg",
    "1899-01-01.jpg",
  ])("PHOTO-10 finds no date in %s", (fileName) => {
    expect(dateFromFile(fileName)).toBeUndefined();
  });
});

const facts = (overrides: Partial<PhotoFacts> = {}): PhotoFacts => ({
  fileName: "IMG_4410.JPG",
  fileDate: "2026-10-09",
  metadata: {},
  ...overrides,
});

const CANNON_BEACH = { city: "Cannon Beach", label: "Cannon Beach, OR" };

describe("photoDetails", () => {
  it("PHOTO-10 takes the name, date and place from the photo first", () => {
    expect(
      photoDetails(
        facts({
          fileName: "halloween-costumes-2025-10-31.jpg",
          metadata: { title: "Mia at the lake", takenOn: "2026-08-16" },
          place: CANNON_BEACH,
        }),
      ),
    ).toEqual({
      title: "Mia at the lake",
      takenOn: "2026-08-16",
      place: "Cannon Beach, OR",
      sources: { title: "photo", takenOn: "photo", place: "photo-location" },
      checked: false,
    });
  });

  it("PHOTO-10 guesses the name and date from the file name when the photo has none", () => {
    expect(photoDetails(facts({ fileName: "halloween-costumes-2025-10-31.jpg" }))).toEqual({
      title: "Halloween costumes",
      takenOn: "2025-10-31",
      sources: { title: "file-name", takenOn: "file-name", place: "none" },
      checked: false,
    });
  });

  it("PHOTO-10 names a photo by its place's city when the file name has no words", () => {
    expect(
      photoDetails(facts({ metadata: { takenOn: "2026-08-16" }, place: CANNON_BEACH })),
    ).toEqual({
      title: "Cannon Beach",
      takenOn: "2026-08-16",
      place: "Cannon Beach, OR",
      sources: { title: "place", takenOn: "photo", place: "photo-location" },
      checked: false,
    });
  });

  it("PHOTO-10 falls back to the raw file name and the file's date", () => {
    expect(photoDetails(facts())).toEqual({
      title: "IMG_4410",
      takenOn: "2026-10-09",
      sources: { title: "file", takenOn: "file-date", place: "none" },
      checked: false,
    });
  });

  it.each(["  ", "OLYMPUS DIGITAL CAMERA", "Default", "image"])(
    "PHOTO-10 ignores the camera's placeholder title %j",
    (title) => {
      expect(photoDetails(facts({ metadata: { title } })).sources.title).toBe("file");
    },
  );

  it("PHOTO-10 trims the photo's title", () => {
    expect(photoDetails(facts({ metadata: { title: " Lake day \n" } })).title).toBe("Lake day");
  });
});
