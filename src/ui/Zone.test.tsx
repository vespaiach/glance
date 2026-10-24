import { render, screen } from "@testing-library/react";
import type { ZoneState } from "@/domain/zoneState";
import { Zone } from "./Zone";

function renderZone(state: ZoneState<string>) {
  return render(
    <Zone
      state={state}
      loading={<span>Loading</span>}
      empty={<span>Nothing yet</span>}
      failed={<span>Unavailable</span>}
    >
      {(rows, updatedAt) => (
        <span>
          {rows.join(", ")}
          {updatedAt && ` · Updated ${updatedAt}`}
        </span>
      )}
    </Zone>,
  );
}

test("LOAD-02 Zone renders its loading state", () => {
  renderZone({ kind: "loading" });

  expect(screen.getByText("Loading")).toBeInTheDocument();
});

test("FAIL-01 Zone renders its failed state", () => {
  renderZone({ kind: "failed" });

  expect(screen.getByText("Unavailable")).toBeInTheDocument();
});

test("tech§4.4 Zone renders its empty state", () => {
  renderZone({ kind: "empty" });

  expect(screen.getByText("Nothing yet")).toBeInTheDocument();
});

test("tech§4.4 Zone renders ready rows", () => {
  renderZone({ kind: "ready", data: ["Soccer", "Dinner"] });

  expect(screen.getByText("Soccer, Dinner")).toBeInTheDocument();
});

test("FAIL-02 Zone passes the last sync time to ready rows", () => {
  renderZone({ kind: "ready", data: ["Soccer"], updatedAt: "2:30 PM" });

  expect(screen.getByText("Soccer · Updated 2:30 PM")).toBeInTheDocument();
});

test("tech§4.4 Zone shows its failed state when its content throws", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});

  render(
    <>
      <Zone
        state={{ kind: "ready", data: ["a"] }}
        loading={null}
        empty={null}
        failed={<span>Unavailable</span>}
      >
        {() => <Broken />}
      </Zone>
      <span>Other zone</span>
    </>,
  );

  expect(screen.getByText("Unavailable")).toBeInTheDocument();
  expect(screen.getByText("Other zone")).toBeInTheDocument();
});

function Broken(): never {
  throw new Error("render failed");
}
