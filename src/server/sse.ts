import "server-only";
import type { SyncBus } from "./bus";

export const HEARTBEAT_MS = 25_000;

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

export function syncStream(
  bus: SyncBus,
  accountId: string,
  signal: AbortSignal,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  let stop = () => {};

  return new ReadableStream({
    start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));

      const unsubscribe = bus.subscribe(accountId, (version) =>
        send(`data: ${JSON.stringify({ version })}\n\n`),
      );

      const heartbeat = setInterval(() => send(": heartbeat\n\n"), HEARTBEAT_MS);

      stop = () => {
        unsubscribe();
        clearInterval(heartbeat);
      };

      const close = () => {
        stop();
        controller.close();
      };

      if (signal.aborted) close();
      else signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      stop();
    },
  });
}
