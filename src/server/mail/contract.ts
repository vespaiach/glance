import type { Mailer, MailMessage } from "./mailer";

export type MailOutcome = "accepted" | "rejected" | "unreachable";

export type MailerHarness = { mailer: Mailer; answer(outcome: MailOutcome): void };

export type FakeFetch = {
  fetch: typeof fetch;
  requests: Request[];
  answer(outcome: MailOutcome): void;
};

export const MESSAGE: MailMessage = {
  to: "maria@example.com",
  subject: "Your Glance sign-in link",
  text: "Open https://glance.example.com/api/auth/verify?t=secret-token",
  html: '<a href="https://glance.example.com/api/auth/verify?t=secret-token">Sign in</a>',
};

const SECRET = "secret-token";

export function mailerContract(harness: () => MailerHarness): void {
  it("D14 answers ok when the provider accepts the message", async () => {
    const { mailer, answer } = harness();
    answer("accepted");

    expect(await mailer.send(MESSAGE)).toEqual({ ok: true, value: undefined });
  });

  it("D14 answers mail-failed without throwing when the provider rejects the message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { mailer, answer } = harness();
    answer("rejected");

    expect(await mailer.send(MESSAGE)).toEqual({ ok: false, error: "mail-failed" });
  });

  it("D14 answers mail-failed without throwing when the provider is unreachable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { mailer, answer } = harness();
    answer("unreachable");

    expect(await mailer.send(MESSAGE)).toEqual({ ok: false, error: "mail-failed" });
  });

  it("D14 never logs the message, which holds the sign-in link", async () => {
    const logged = spyOnLogs();
    const { mailer, answer } = harness();

    for (const outcome of ["accepted", "rejected", "unreachable"] as const) {
      answer(outcome);
      await mailer.send(MESSAGE);
    }

    expect(logged().length).toBeGreaterThan(0);
    expect(logged().join("\n")).not.toContain(SECRET);
  });
}

export function fakeFetch(): FakeFetch {
  const requests: Request[] = [];

  let outcome: MailOutcome = "accepted";

  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);

    requests.push(request.clone());

    return reply(outcome, request);
  };

  return {
    fetch: fetch as typeof globalThis.fetch,
    requests,
    answer: (next) => {
      outcome = next;
    },
  };
}

async function reply(outcome: MailOutcome, request: Request): Promise<Response> {
  if (outcome === "unreachable") throw new TypeError("fetch failed");

  if (outcome === "rejected") {
    return Response.json({ message: `Refused ${await request.text()}` }, { status: 422 });
  }

  return Response.json({ id: "mail-1" });
}

function spyOnLogs(): () => string[] {
  const spies = (["error", "warn", "info", "log"] as const).map((level) =>
    vi.spyOn(console, level).mockImplementation(() => {}),
  );

  return () => spies.flatMap((spy) => spy.mock.calls.flat().map(logText));
}

function logText(value: unknown): string {
  if (value instanceof Error) return `${value.message} ${value.stack ?? ""}`;

  return typeof value === "string" ? value : JSON.stringify(value);
}
