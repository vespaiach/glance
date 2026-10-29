import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, useReducer } from "react";
import type { Tag } from "@/domain/schemas";
import {
  type ImportPageState,
  type ImportReview,
  importPageReducer,
  type OpenImportPage,
} from "../importPage";
import { ImportPage } from "./ImportPage";

type Props = ComponentProps<typeof ImportPage>;

const TAGS: Tag[] = [
  { id: "mia", name: "Mia", color: "pink", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "leo", name: "Leo", color: "sky", createdAt: "2026-01-01T00:00:00.000Z" },
];

const REVIEW: ImportReview = {
  fileName: "soccer.ics",
  size: 12_288,
  range: { from: "Oct 31", to: "Dec 12" },
  rows: [
    { id: "1", date: "Sat, Oct 31", title: "U10 game", time: "9:00 AM", duplicate: false },
    { id: "2", date: "Tue, Nov 3", title: "Practice", time: "5:30 PM", duplicate: true },
    { id: "3", date: "Sat, Nov 21", title: "Picture day", duplicate: false },
    {
      id: "4",
      date: "Tue, Nov 24",
      title: "Swim",
      time: "4:00 PM",
      weekly: true,
      duplicate: false,
    },
  ],
  newCount: 3,
  duplicates: 1,
};

const review = (over: Partial<ImportReview> = {}): OpenImportPage => ({
  step: "review",
  review: { ...REVIEW, ...over },
  who: "everyone",
});

const done = (count: number, duplicates: number): OpenImportPage => ({
  step: "done",
  done: { count, who: "mia", range: REVIEW.range, duplicates },
});

function renderPage(state: OpenImportPage, overrides: Partial<Props> = {}): Props {
  const props: Props = {
    breakpoint: "normal",
    state,
    leaving: false,
    tags: TAGS,
    dispatch: vi.fn(),
    onFile: vi.fn(),
    onImport: vi.fn(),
    onUndo: vi.fn(),
    onUndoLast: vi.fn(),
    onOpenCalendar: vi.fn(),
    onNewCode: vi.fn(),
    onLeft: vi.fn(),
    ...overrides,
  };

  render(<ImportPage {...props} />);

  return props;
}

function Live({ start }: { start: ImportPageState }) {
  const [state, dispatch] = useReducer(importPageReducer, start);

  if (state.step === "closed") return null;

  return (
    <ImportPage
      breakpoint="normal"
      state={state}
      leaving={false}
      tags={TAGS}
      dispatch={dispatch}
      onFile={() => {}}
      onImport={() => dispatch({ type: "importing" })}
      onUndo={() => {}}
      onUndoLast={() => {}}
      onOpenCalendar={() => {}}
      onNewCode={() => {}}
      onLeft={() => {}}
    />
  );
}

test("IMP-03 Source offers Send from phone and Choose file, with Back to settings", async () => {
  const props = renderPage({ step: "source" });

  expect(screen.getByText("Import events")).toBeInTheDocument();
  expect(screen.queryByText(/Last import/)).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Send from phone/ }));
  await userEvent.click(screen.getByRole("button", { name: "Back to settings" }));

  expect(props.dispatch).toHaveBeenNthCalledWith(1, { type: "phone" });
  expect(props.dispatch).toHaveBeenNthCalledWith(2, { type: "back" });
});

test("IMP-03 Choose file passes the picked .ics file on", async () => {
  const props = renderPage({ step: "source" });

  const file = new File(["BEGIN:VCALENDAR"], "soccer.ics", { type: "text/calendar" });

  await userEvent.upload(screen.getByLabelText("Choose file"), file);

  expect(props.onFile).toHaveBeenCalledWith(file);
});

test("IMP-03 IMP-10 a last import shows its tile and Undo while undo is open", async () => {
  const props = renderPage(
    { step: "source" },
    { last: { date: "Oct 29", count: 16, who: "mia", canUndo: true } },
  );

  expect(screen.getByText("Last import · Oct 29")).toBeInTheDocument();
  expect(screen.getByText("16 events for Mia")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Undo" }));

  expect(props.onUndoLast).toHaveBeenCalledOnce();
});

test("IMP-10 the last import tile has no Undo once undo has closed", () => {
  renderPage(
    { step: "source" },
    { last: { date: "Oct 29", count: 1, who: "everyone", canUndo: false } },
  );

  expect(screen.getByText("1 event for Everyone")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
});

test("IMP-04 Send from phone shows the steps and New code", async () => {
  const props = renderPage(
    { step: "phone" },
    { phone: { link: "https://glance.test/x", endsIn: "9:42" } },
  );

  expect(screen.getByText("Waiting for a file · code ends in 9:42")).toBeInTheDocument();
  expect(screen.getByText("Pick the .ics file on the page that opens")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "New code" }));
  await userEvent.click(screen.getByRole("button", { name: "Back" }));

  expect(props.onNewCode).toHaveBeenCalledOnce();
  expect(props.dispatch).toHaveBeenCalledWith({ type: "back" });
});

test("IMP-07 Import counts only the new events", () => {
  renderPage(review());

  expect(screen.getByRole("button", { name: "Import 3 events" })).toBeEnabled();
});

test("IMP-07 one new event reads Import 1 event", () => {
  renderPage(review({ newCount: 1 }));

  expect(screen.getByRole("button", { name: "Import 1 event" })).toBeEnabled();
});

test("IMP-07 the list marks duplicates, all-day and weekly rows", () => {
  renderPage(review());

  const list = within(screen.getByRole("list"));

  expect(list.getByText("Practice · already added")).toBeInTheDocument();
  expect(list.getByText("All day")).toBeInTheDocument();
  expect(list.getByText("4:00 PM · Every week")).toBeInTheDocument();
  expect(screen.getByText("All events · 4")).toBeInTheDocument();
  expect(screen.getByText("Oct 31 – Dec 12 · 12 KB")).toBeInTheDocument();
});

test("IMP-07 the skip line with 0, 1 and n duplicates", () => {
  const { unmount } = render(<Live start={review({ duplicates: 0 })} />);

  expect(screen.getByText("Past events aren’t imported.")).toBeInTheDocument();

  unmount();

  const again = render(<Live start={review({ duplicates: 1 })} />);

  expect(
    screen.getByText(
      "1 is already on the calendar and will be skipped. Past events aren’t imported.",
    ),
  ).toBeInTheDocument();

  again.unmount();

  render(<Live start={review({ duplicates: 2 })} />);

  expect(
    screen.getByText(
      "2 are already on the calendar and will be skipped. Past events aren’t imported.",
    ),
  ).toBeInTheDocument();
});

test("IMP-07 Who is a single pick, Everyone by default", async () => {
  render(<Live start={review()} />);

  const group = screen.getByRole("radiogroup", { name: "Who these are for" });

  expect(within(group).getByRole("radio", { name: "Everyone" })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await userEvent.click(within(group).getByRole("radio", { name: "Mia" }));
  await userEvent.click(within(group).getByRole("radio", { name: "Leo" }));

  const checked = within(group)
    .getAllByRole("radio")
    .filter((radio) => radio.getAttribute("aria-checked") === "true");

  expect(checked.map((radio) => radio.textContent)).toEqual(["Leo"]);
});

test("IMP-08 Importing… disables every button on the page", async () => {
  render(<Live start={review()} />);

  await userEvent.click(screen.getByRole("button", { name: "Import 3 events" }));

  expect(screen.getByRole("button", { name: "Importing…" })).toBeDisabled();

  for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
});

test("IMP-07 Change goes back to Source", async () => {
  render(<Live start={review()} />);

  await userEvent.click(screen.getByRole("button", { name: "Change" }));

  expect(screen.getByText("Add events from a file")).toBeInTheDocument();
});

test("IMP-09 Imported with 0, 1 and n duplicates", () => {
  const first = render(<Live start={done(16, 2)} />);

  expect(screen.getByText("16 events added")).toBeInTheDocument();
  expect(screen.getByText("For Mia · Oct 31 – Dec 12. 2 duplicates skipped.")).toBeInTheDocument();

  first.unmount();

  const second = render(<Live start={done(1, 1)} />);

  expect(screen.getByText("1 event added")).toBeInTheDocument();
  expect(screen.getByText("For Mia · Oct 31 – Dec 12. 1 duplicate skipped.")).toBeInTheDocument();

  second.unmount();

  render(<Live start={done(3, 0)} />);

  expect(screen.getByText("For Mia · Oct 31 – Dec 12.")).toBeInTheDocument();
});

test("IMP-09 Imported closes with ✕, undoes, or opens the calendar", async () => {
  const props = renderPage(done(16, 2));

  await userEvent.click(screen.getByRole("button", { name: "Undo import" }));
  await userEvent.click(screen.getByRole("button", { name: "Open calendar" }));
  await userEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(props.onUndo).toHaveBeenCalledOnce();
  expect(props.onOpenCalendar).toHaveBeenCalledOnce();
  expect(props.dispatch).toHaveBeenCalledWith({ type: "back" });
});

test("IMP-06 a non-calendar file: Choose again goes to Source", async () => {
  const props = renderPage({ step: "error", error: "type" });

  expect(screen.getByRole("alert")).toHaveTextContent("This isn’t a calendar file");

  await userEvent.click(screen.getByRole("button", { name: "Choose again" }));

  expect(props.dispatch).toHaveBeenCalledWith({ type: "source" });
});

test("IMP-06 no upcoming events: Choose another file goes to Source", async () => {
  const props = renderPage({ step: "error", error: "empty" });

  expect(screen.getByRole("alert")).toHaveTextContent("No upcoming events in this file");

  await userEvent.click(screen.getByRole("button", { name: "Choose another file" }));

  expect(props.dispatch).toHaveBeenCalledWith({ type: "source" });
});

test("IMP-08 Couldn’t import: Try again returns to the review", async () => {
  render(<Live start={{ step: "error", error: "offline", review: REVIEW, who: "leo" }} />);

  expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t import");

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(screen.getByRole("radio", { name: "Leo" })).toHaveAttribute("aria-checked", "true");
});
