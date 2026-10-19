import { fakeFetch, MESSAGE, mailerContract } from "./contract";
import { createMailgunMailer } from "./mailgun";

const FROM = "Glance <hello@example.com>";

const US = { apiKey: "key-test", domain: "mg.example.com", region: "us" } as const;

describe("createMailgunMailer", () => {
  mailerContract(() => {
    const fake = fakeFetch();

    return { mailer: createMailgunMailer(US, FROM, fake.fetch), answer: fake.answer };
  });

  it("tech§6.2 posts form fields to the domain's messages URL with Basic api:key", async () => {
    const fake = fakeFetch();

    await createMailgunMailer(US, FROM, fake.fetch).send(MESSAGE);

    const [request] = fake.requests;
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("https://api.mailgun.net/v3/mg.example.com/messages");
    expect(request?.headers.get("authorization")).toBe(`Basic ${btoa("api:key-test")}`);
    expect(request?.headers.get("content-type")).toMatch(/^application\/x-www-form-urlencoded/);
    expect(Object.fromEntries(new URLSearchParams(await request?.text()))).toEqual({
      from: FROM,
      ...MESSAGE,
    });
  });

  it("tech§6.2 posts to the EU host for region eu", async () => {
    const fake = fakeFetch();

    await createMailgunMailer({ ...US, region: "eu" }, FROM, fake.fetch).send(MESSAGE);

    expect(fake.requests[0]?.url).toBe("https://api.eu.mailgun.net/v3/mg.example.com/messages");
  });

  it("tech§6.2 leaves the html field out when the message has none", async () => {
    const fake = fakeFetch();

    await createMailgunMailer(US, FROM, fake.fetch).send({
      to: "a@example.com",
      subject: "S",
      text: "T",
    });

    expect(new URLSearchParams(await fake.requests[0]?.text()).has("html")).toBe(false);
  });
});
