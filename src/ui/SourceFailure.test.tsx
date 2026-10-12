import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CloudOff } from "lucide-react";
import { SourceFailure } from "./SourceFailure";

const props = {
  icon: CloudOff,
  title: "Weather unavailable",
  body: "The forecast service isn’t responding. Trying again in 1 min.",
  retryLabel: "Try again",
};

test("FAIL-01 SourceFailure shows the source, the retry countdown and Try again", () => {
  render(<SourceFailure {...props} onRetry={() => {}} />);

  const status = screen.getByRole("status");
  expect(status).toHaveTextContent("Weather unavailable");
  expect(status).toHaveTextContent("Trying again in 1 min.");
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
});

test("FAIL-01 SourceFailure Try again reports the tap", async () => {
  const onRetry = vi.fn();
  render(<SourceFailure {...props} onRetry={onRetry} />);

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(onRetry).toHaveBeenCalledTimes(1);
});
