import { render, screen } from "@testing-library/react";
import { Eyebrow } from "./Eyebrow";

test("spec§4.2 Eyebrow renders its label as written in source", () => {
  render(<Eyebrow size="caption">Screen settings</Eyebrow>);

  expect(screen.getByText("Screen settings")).toBeInTheDocument();
});
