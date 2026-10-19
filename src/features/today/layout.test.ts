import { todayLayout } from "./layout";

describe("todayLayout", () => {
  it.each([
    [1920, 1080, "threeColumn", 2, 2],
    [2560, 1440, "threeColumn", 2, 2],
    [1600, 900, "threeColumn", 2, 2],
    [1599, 900, "threeColumn", 1, 2],
    [1440, 900, "threeColumn", 1, 2],
    [1280, 800, "threeColumn", 1, 1],
    [1440, 879, "threeColumn", 1, 1],
    [1440, 880, "threeColumn", 1, 2],
    [1181, 820, "threeColumn", 1, 1],
    [1180, 820, "twoColumn", 2, 2],
    [1024, 768, "twoColumn", 2, 2],
    [1024, 1024, "twoColumn", 2, 2],
    [1024, 1366, "portrait", 1, 2],
    [1080, 1920, "portrait", 1, 2],
    [1023, 1366, "stacked", 2, 2],
    [820, 1180, "stacked", 2, 2],
    [1023, 700, "stacked", 2, 2],
    [600, 960, "stacked", 2, 2],
    [599, 960, "stacked", 1, 2],
    [390, 844, "stacked", 1, 2],
  ] as const)(
    "TODAY-09 TODAY-13 %i×%i is %s with %i note columns and %i notes",
    (width, height, grid, noteColumns, noteLimit) => {
      expect(todayLayout(width, height)).toEqual({ grid, noteColumns, noteLimit });
    },
  );
});
