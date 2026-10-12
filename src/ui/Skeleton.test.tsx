import { render, screen } from "@testing-library/react";
import { Skeleton, SkeletonBlock } from "./Skeleton";

test("LOAD-02 Skeleton is a busy status named after what is loading", () => {
  render(
    <Skeleton label="Loading events">
      <SkeletonBlock width="80%" height={18} />
    </Skeleton>,
  );

  const status = screen.getByRole("status", { name: "Loading events" });
  expect(status).toHaveAttribute("aria-busy", "true");
});

test("LOAD-02 SkeletonBlock placeholders are hidden from assistive tech", () => {
  const { container } = render(
    <Skeleton label="Loading notes">
      <SkeletonBlock height={150} />
      <SkeletonBlock height={150} />
    </Skeleton>,
  );

  const blocks = container.querySelectorAll('[aria-hidden="true"]');
  expect(blocks).toHaveLength(2);
});
