import { MAX_PHOTO_BYTES, photoTitle, uploadProblem } from "./photoUpload";

describe("uploadProblem", () => {
  it("PHOTO-04 accepts an image up to 20 MB", () => {
    expect(uploadProblem({ type: "image/jpeg", size: MAX_PHOTO_BYTES })).toBeUndefined();
  });

  it("PHOTO-04 rejects an image over 20 MB as too large", () => {
    expect(uploadProblem({ type: "image/png", size: MAX_PHOTO_BYTES + 1 })).toBe("too-large");
  });

  it("PHOTO-04 rejects a file that isn't an image as not a photo", () => {
    expect(uploadProblem({ type: "application/pdf", size: 1000 })).toBe("not-a-photo");
  });

  it("PHOTO-08 reports not a photo before too large", () => {
    expect(uploadProblem({ type: "video/mp4", size: MAX_PHOTO_BYTES * 2 })).toBe("not-a-photo");
  });
});

describe("photoTitle", () => {
  it("PHOTO-03 titles a photo by its file name without the extension", () => {
    expect(photoTitle("IMG_2041.jpeg")).toBe("IMG_2041");
  });

  it("PHOTO-03 keeps a file name with no extension", () => {
    expect(photoTitle("Recipe card")).toBe("Recipe card");
  });
});
