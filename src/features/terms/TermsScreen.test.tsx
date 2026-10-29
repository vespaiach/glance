import { render, screen } from "@testing-library/react";
import { TermsScreen } from "./TermsScreen";

const SECTIONS = [
  "Acceptance",
  "Eligibility",
  "The service",
  "Open source",
  "Weather data",
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

test("TERMS-01 the header has Back to Glance, opening / in the same tab", () => {
  render(<TermsScreen />);

  const back = screen.getByRole("link", { name: "Back to Glance" });

  expect(back).toHaveAttribute("href", "/");
  expect(back).not.toHaveAttribute("target");
});

test("TERMS-01 lists the 17 numbered sections in order", () => {
  render(<TermsScreen />);

  const headings = screen
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent);

  expect(headings).toEqual(SECTIONS);
  expect(screen.getByText("17")).toBeInTheDocument();
});

test("TERMS-01 §05 Weather data credits Open-Meteo under CC BY 4.0", () => {
  render(<TermsScreen />);

  expect(screen.getByText("05")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open-Meteo" })).toHaveAttribute(
    "href",
    "https://open-meteo.com/",
  );
  expect(
    screen.getByRole("link", {
      name: "Creative Commons Attribution 4.0 International License (CC BY 4.0)",
    }),
  ).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
  expect(screen.getByRole("link", { name: "open-meteo.com/en/terms" })).toHaveAttribute(
    "href",
    "https://open-meteo.com/en/terms",
  );
});

test("TERMS-01 Termination points at the renumbered sections", () => {
  render(<TermsScreen />);

  expect(screen.getByText(/Sections 7, 9 and 12–16 continue to apply/)).toBeInTheDocument();
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

test("TERMS-01 How your data is stored says what an error report holds, never what you enter", () => {
  render(<TermsScreen />);

  expect(
    screen.getByText(
      /A report holds the error, the page, the app version, when it happened and your time zone, your browser and device, and your IP address with its last part removed, never what you enter/,
    ),
  ).toBeInTheDocument();
});
