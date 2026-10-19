import { fakeFetch, MESSAGE, mailerContract } from "./contract";
import { createResendMailer } from "./resend";

const FROM = "Glance <hello@example.com>";

describe("createResendMailer", () => {
  mailerContract(() => {
    const fake = fakeFetch();

    return {
      mailer: createResendMailer({ apiKey: "re_test" }, FROM, fake.fetch),
      answer: fake.answer,
    };
  });

  it("tech§6.2 posts JSON from MAIL_FROM to Resend with the API key as a Bearer token", async () => {
    const fake = fakeFetch();

    await createResendMailer({ apiKey: "re_test" }, FROM, fake.fetch).send(MESSAGE);

    const [request] = fake.requests;
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("https://api.resend.com/emails");
    expect(request?.headers.get("authorization")).toBe("Bearer re_test");
    expect(request?.headers.get("content-type")).toBe("application/json");
    expect(await request?.json()).toEqual({ from: FROM, ...MESSAGE });
  });

  it("tech§6.2 leaves html out when the message has none", async () => {
    const fake = fakeFetch();

    await createResendMailer({ apiKey: "re_test" }, FROM, fake.fetch).send({
      to: "maria@example.com",
      subject: "Hi",
      text: "Body",
    });

    expect(await fake.requests[0]?.json()).toEqual({
      from: FROM,
      to: "maria@example.com",
      subject: "Hi",
      text: "Body",
    });
  });
});
