import { render, screen } from "@testing-library/react";
import { TermsScreen } from "./TermsScreen";

const SECTIONS = [
  "Acceptance",
  "Eligibility",
  "The service",
  "Open source",
  "Your account",
  "Your content",
  "Acceptable use",
  "How your data is stored",
  "Deleting your account",
  "Termination",
  "No warranties",
  "Limitation of liability",
  "Indemnification",
  "Governing law",
  "Changes and general terms",
  "Contact",
];

test("TERMS-01 shows the title, the effective date and the In short cards", () => {
  render(<TermsScreen />);

  expect(screen.getByRole("heading", { level: 1, name: "Terms of service" })).toBeInTheDocument();
  expect(screen.getByText("Effective October 24, 2026")).toBeInTheDocument();
  expect(screen.getByText("In short")).toBeInTheDocument();
  for (const title of [
    "Free and open source",
    "Your data, not encrypted",
    "Provided as is",
    "18 and over",
  ]) {
    expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
  }
});

test("TERMS-01 lists the 16 numbered sections in order", () => {
  render(<TermsScreen />);

  const headings = screen
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent);

  expect(headings).toEqual(SECTIONS);
  expect(screen.getByText("16")).toBeInTheDocument();
});

test("TERMS-01 links Source on GitHub and shows the footer", () => {
  render(<TermsScreen />);

  expect(screen.getByRole("link", { name: "Source on GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/vespaiach/glance",
  );
  expect(screen.getByText("Glance · takeaglance.app")).toBeInTheDocument();
  expect(screen.getByText("MIT License")).toBeInTheDocument();
});
