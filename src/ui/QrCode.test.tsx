import { render, screen } from "@testing-library/react";
import { QrCode } from "./QrCode";

const LINK = "https://glance.example.com/api/auth/verify?t=abc";

function drawn(): string {
  return screen.getByRole("img").querySelector("path")?.getAttribute("d") ?? "";
}

test("SIGNIN-15 draws the link as a square QR code with a label", () => {
  render(<QrCode value={LINK} label="Sign-in code" />);

  const code = screen.getByRole("img", { name: "Sign-in code" });
  const [, , width, height] = (code.getAttribute("viewBox") ?? "").split(" ").map(Number);
  expect(width).toBe(height);
  expect(width).toBeGreaterThanOrEqual(21);
  expect(drawn()).toMatch(/^M\d+ \d+h1v1h-1z/);
});

test("SIGNIN-15 a new link draws a new code", () => {
  const { rerender } = render(<QrCode value={LINK} label="Sign-in code" />);
  const first = drawn();

  rerender(<QrCode value={`${LINK}x`} label="Sign-in code" />);

  expect(drawn()).not.toBe(first);
});

test("SIGNIN-15 no link draws an empty code of the same size", () => {
  render(<QrCode label="Sign-in code" />);

  expect(screen.getByRole("img", { name: "Sign-in code" }).querySelector("path")).toBeNull();
});
