import { sendNotification, WebPushError } from "web-push";
import { spyOnLoggedErrors } from "../testLog";
import { createWebPush } from ".";

vi.mock("web-push", async (importActual) => ({
  ...(await importActual<typeof import("web-push")>()),
  sendNotification: vi.fn(),
}));

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/kitchen-screen-token";

const TARGET = { endpoint: ENDPOINT, keys: { p256dh: "p256dh-key", auth: "auth-secret" } };

const MESSAGE = { title: "Soccer practice", body: "In 15 minutes", data: { url: "/today" } };

const send = createWebPush({
  publicKey: "public",
  privateKey: "private",
  subject: "mailto:a@b.co",
});

function rejecting(statusCode: number): void {
  vi.mocked(sendNotification).mockRejectedValueOnce(
    new WebPushError(
      "Received unexpected response code",
      statusCode,
      {},
      `{"reason":"bad ${ENDPOINT}"}`,
      ENDPOINT,
    ),
  );
}

describe("createWebPush", () => {
  it("D30 answers gone for a subscription the push service no longer knows, and logs nothing", async () => {
    const logged = spyOnLoggedErrors();
    rejecting(410);

    expect(await send(TARGET, MESSAGE)).toEqual({ ok: false, error: "gone" });
    expect(logged()).toEqual([]);
  });

  it("tech§6.6 logs a failed send with its status and never the endpoint or keys", async () => {
    const logged = spyOnLoggedErrors();
    rejecting(500);

    expect(await send(TARGET, MESSAGE)).toEqual({ ok: false, error: "failed" });
    expect(logged()).toMatchObject([
      {
        source: "push",
        event: "send-failed",
        status: 500,
        error: { name: "WebPushError", message: "Received unexpected response code" },
      },
    ]);
    expect(JSON.stringify(logged())).not.toMatch(/kitchen-screen-token|p256dh-key|auth-secret/);
  });
});
