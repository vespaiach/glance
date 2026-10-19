import { fakeFetch, MESSAGE, mailerContract } from "./contract";
import { createMailtrapMailer } from "./mailtrap";

const FROM = "Glance <hello@example.com>";

describe("createMailtrapMailer", () => {
  mailerContract(() => {
    const fake = fakeFetch();

    return {
      mailer: createMailtrapMailer({ apiToken: "mt_test" }, FROM, fake.fetch),
      answer: fake.answer,
    };
  });

  it("tech§6.2 posts JSON with split addresses to the sending API with the token as a Bearer token", async () => {
    const fake = fakeFetch();

    await createMailtrapMailer({ apiToken: "mt_test" }, FROM, fake.fetch).send(MESSAGE);

    const [request] = fake.requests;
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("https://send.api.mailtrap.io/api/send");
    expect(request?.headers.get("authorization")).toBe("Bearer mt_test");
    expect(request?.headers.get("content-type")).toBe("application/json");
    expect(await request?.json()).toEqual({
      from: { email: "hello@example.com", name: "Glance" },
      to: [{ email: "maria@example.com" }],
      subject: MESSAGE.subject,
      text: MESSAGE.text,
      html: MESSAGE.html,
    });
  });

  it("tech§6.2 posts to the sandbox inbox when one is set", async () => {
    const fake = fakeFetch();

    await createMailtrapMailer({ apiToken: "mt_test", inboxId: "4242" }, FROM, fake.fetch).send(
      MESSAGE,
    );

    expect(fake.requests[0]?.url).toBe("https://sandbox.api.mailtrap.io/api/send/4242");
  });

  it("tech§6.2 sends a bare MAIL_FROM address without a name", async () => {
    const fake = fakeFetch();

    await createMailtrapMailer({ apiToken: "mt_test" }, "hello@example.com", fake.fetch).send(
      MESSAGE,
    );

    expect((await fake.requests[0]?.json())?.from).toEqual({ email: "hello@example.com" });
  });
});
