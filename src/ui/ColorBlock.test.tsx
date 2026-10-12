import { render, screen } from "@testing-library/react";
import { ColorBlock } from "./ColorBlock";

test("spec§4.2 ColorBlock is a section that passes attributes through", () => {
  render(
    <ColorBlock tone={3} aria-label="Weather">
      64°
    </ColorBlock>,
  );

  const block = screen.getByRole("region", { name: "Weather" });

  expect(block.tagName).toBe("SECTION");
  expect(block).toHaveTextContent("64°");
});
