import { render, screen } from "@testing-library/react";
import TermsPage from "./page";

test("TERMS-01 /terms renders signed out, with no providers", () => {
  render(<TermsPage />);

  expect(screen.getByRole("heading", { level: 1, name: "Terms of service" })).toBeInTheDocument();
});
