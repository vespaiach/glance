import { announce, createBus } from "./bus";

const MARIA = "0192f3a0-0000-7000-8000-000000000001";
const OMAR = "0192f3a0-0000-7000-8000-000000000002";

describe("createBus", () => {
  it("tech§5 sends a published version to every listener of the account", () => {
    const bus = createBus();
    const first = vi.fn();
    const second = vi.fn();

    bus.subscribe(MARIA, first);
    bus.subscribe(MARIA, second);
    bus.publish(MARIA, 7);

    expect(first).toHaveBeenCalledWith(7);
    expect(second).toHaveBeenCalledWith(7);
  });

  it("tech§5 never sends one account's change to another account's listeners", () => {
    const bus = createBus();
    const listener = vi.fn();

    bus.subscribe(MARIA, listener);
    bus.publish(OMAR, 7);

    expect(listener).not.toHaveBeenCalled();
  });

  it("tech§5 stops sending to a listener once it unsubscribes", () => {
    const bus = createBus();
    const listener = vi.fn();

    const unsubscribe = bus.subscribe(MARIA, listener);
    unsubscribe();
    bus.publish(MARIA, 7);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("announce", () => {
  it("tech§5 publishes a saved row's version to its account", () => {
    const bus = createBus();
    const listener = vi.fn();
    bus.subscribe(MARIA, listener);

    const saved = { ok: true as const, value: { version: 3 } };

    expect(announce(bus, MARIA, saved)).toBe(saved);
    expect(listener).toHaveBeenCalledWith(3);
  });

  it("tech§5 publishes nothing for a refused write", () => {
    const bus = createBus();
    const listener = vi.fn();
    bus.subscribe(MARIA, listener);

    announce(bus, MARIA, { ok: false as const, error: "not-found" });

    expect(listener).not.toHaveBeenCalled();
  });
});
