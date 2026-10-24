import { describe, expect, it, vi } from "vitest";
import { createMailpitSender, createResendSender } from "./sender";

const mail = { to: "bo@x.test", subject: "Hi", text: "Body", headers: { "List-Unsubscribe": "<https://x.test/u>" } };

describe("createResendSender", () => {
  it("posts the email to Resend with the key and the from address", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 200 }));
    await createResendSender({ apiKey: "re_key", from: "82 Startup <n@x.test>", fetch }).send(mail);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer re_key");
    expect(JSON.parse(String(init.body))).toEqual({ from: "82 Startup <n@x.test>", to: ["bo@x.test"], subject: "Hi", text: "Body", headers: mail.headers });
  });

  it("throws an error with only the status, never the answer text or the address, when Resend refuses", async () => {
    const fetch = vi.fn(async () => new Response("bo@x.test is not allowed", { status: 422 }));
    const error = await createResendSender({ apiKey: "k", from: "f", fetch }).send(mail).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("422");
    expect((error as Error).message).not.toContain("bo@x.test");
  });

  it("throws a plain error when the network fails", async () => {
    const fetch = vi.fn(async () => {
      throw new Error("connect ECONNREFUSED bo@x.test");
    });
    const error = await createResendSender({ apiKey: "k", from: "f", fetch }).send(mail).catch((e: Error) => e);
    expect((error as Error).message).not.toContain("bo@x.test");
  });
});

describe("createMailpitSender", () => {
  it("posts to the local mailbox's send API", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 200 }));
    await createMailpitSender({ baseUrl: "http://127.0.0.1:55324", from: "82 Startup <n@x.test>", fetch }).send(mail);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:55324/api/v1/send");
    const body = JSON.parse(String(init.body));
    expect(body.To).toEqual([{ Email: "bo@x.test" }]);
    expect(body.Subject).toBe("Hi");
    expect(body.Text).toBe("Body");
    expect(body.Headers).toEqual(mail.headers);
  });
});
