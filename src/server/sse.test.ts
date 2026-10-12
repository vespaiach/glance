import { createBus, type SyncBus } from "./bus";
import { HEARTBEAT_MS, syncStream } from "./sse";

const MARIA = "0192f3a0-0000-7000-8000-000000000001";
const OMAR = "0192f3a0-0000-7000-8000-000000000002";

type Opened = {
  bus: SyncBus;
  abort: () => void;
  read: () => Promise<{ done: boolean; value?: string }>;
};

function open(): Opened {
  const bus = createBus();
  const controller = new AbortController();
  const reader = syncStream(bus, MARIA, controller.signal).getReader();

  const read = async () => {
    const { done, value } = await reader.read();

    return { done, value: value && new TextDecoder().decode(value) };
  };

  return { bus, abort: () => controller.abort(), read };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("syncStream", () => {
  it("SYNC-02 sends the new version when the account changes", async () => {
    const stream = open();

    stream.bus.publish(MARIA, 12);

    expect(await stream.read()).toEqual({ done: false, value: 'data: {"version":12}\n\n' });
  });

  it("tech§5 never sends another account's change", async () => {
    const stream = open();

    stream.bus.publish(OMAR, 12);
    stream.bus.publish(MARIA, 13);

    expect(await stream.read()).toEqual({ done: false, value: 'data: {"version":13}\n\n' });
  });

  it("tech§5 sends a heartbeat every 25 s", async () => {
    const stream = open();

    vi.advanceTimersByTime(HEARTBEAT_MS);

    expect(HEARTBEAT_MS).toBe(25_000);
    expect(await stream.read()).toEqual({ done: false, value: ": heartbeat\n\n" });
  });

  it("tech§5 closes and stops listening when the client disconnects", async () => {
    const stream = open();

    stream.abort();
    stream.bus.publish(MARIA, 12);
    vi.advanceTimersByTime(HEARTBEAT_MS);

    expect(await stream.read()).toEqual({ done: true, value: undefined });
    expect(vi.getTimerCount()).toBe(0);
  });
});
