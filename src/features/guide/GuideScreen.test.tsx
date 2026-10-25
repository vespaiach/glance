import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuideScreen } from "./GuideScreen";

const SECTIONS = [
  "Get started with one email",
  "The whole day on one screen",
  "Add an event",
  "Set where the screen is",
  "Leave a note for the family",
  "Share photos on the screen",
  "Make it yours",
  "A calm screen for quiet hours",
  "Never miss the next thing",
  "Take Glance with you",
  "One app, any screen",
  "Questions",
];

test("GUIDE-01 shows the hero with its eyebrow and title", () => {
  render(<GuideScreen season="fall" />);

  expect(screen.getByText("Guide for families")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { level: 1, name: "Your family’s day, at a glance." }),
  ).toBeInTheDocument();
});

test("GUIDE-01 the header links to the page's sections", () => {
  render(<GuideScreen season="fall" />);

  const nav = within(screen.getByRole("navigation"));

  expect(
    nav.getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")]),
  ).toEqual([
    ["Get started", "#start"],
    ["Using Glance", "#today"],
    ["Screen sizes", "#sizes"],
    ["FAQ", "#faq"],
    ["Back to Glance", "/"],
  ]);
});

test("GUIDE-01 the header ends with Back to Glance, opening / in the same tab", () => {
  render(<GuideScreen season="fall" />);

  const back = screen.getByRole("link", { name: "Back to Glance" });

  expect(back).toHaveAttribute("href", "/");
  expect(back).not.toHaveAttribute("target");
});

test("GUIDE-01 lists the 11 sections and Questions in order", () => {
  render(<GuideScreen season="fall" />);

  const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);

  expect(headings).toEqual(SECTIONS);
});

test("GUIDE-01 the reminder step names the lead times of Settings › Notifications", () => {
  render(<GuideScreen season="fall" />);

  expect(screen.getByText(/: 15 or 30 minutes before, or off\./)).toBeInTheDocument();
});

test("GUIDE-01 the first question starts open and each question toggles its answer", async () => {
  render(<GuideScreen season="fall" />);

  const first = screen.getByRole("button", { name: "Does everyone need their own account?" });
  const second = screen.getByRole("button", { name: "Where did the menu go?" });

  expect(first).toHaveAttribute("aria-expanded", "true");
  expect(second).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByText(/It hides after 15 seconds/)).not.toBeInTheDocument();

  await userEvent.click(second);

  expect(second).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText(/It hides after 15 seconds/)).toBeInTheDocument();

  await userEvent.click(first);

  expect(first).toHaveAttribute("aria-expanded", "false");
});

test("GUIDE-01 the footer links to the Terms of Service", () => {
  render(<GuideScreen season="fall" />);

  expect(
    within(screen.getByRole("contentinfo")).getByRole("link", { name: "Terms of Service" }),
  ).toHaveAttribute("href", "/terms");
});
