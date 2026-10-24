import { describe, expect, it } from "vitest";
import { buildEmail, type EmailInput } from "./email";

const CODE = "a".repeat(64);
const base: EmailInput = {
  kind: "connection_request",
  actorId: "11111111-2222-3333-4444-555555555555",
  actorName: "Bo B",
  actorJobTitle: "CTO",
  actorCompany: "Bco",
  preview: "Let us meet at Summit",
  prefs: { requests: true, accepted: false, messages: true, posts: false },
  unsubscribeCode: CODE,
  siteUrl: "https://82startup.vercel.app",
};

describe("buildEmail subject and link", () => {
  it("names the person for each kind and links to the right page", () => {
    const cases = [
      ["connection_request", "Bo B wants to connect on 82 Startup", "/members/"],
      ["connection_accepted", "Bo B accepted your connection request", "/members/"],
      ["message", "New message from Bo B", "/messages/"],
      ["post", "Bo B shared a post", "/messages/"],
    ] as const;
    for (const [kind, subject, path] of cases) {
      const mail = buildEmail({ ...base, kind });
      expect(mail.subject).toBe(subject);
      expect(mail.text).toContain(`https://82startup.vercel.app${path}${base.actorId}`);
    }
  });

  it("keeps a name with line breaks or control characters on one line in the subject", () => {
    const mail = buildEmail({ ...base, actorName: "Bo\r\nBcc: evil@x.test" });
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });
});

describe("buildEmail body", () => {
  it("shows who it is from with job title and company, leaving out what is missing", () => {
    expect(buildEmail(base).text).toContain("Bo B, CTO at Bco");
    expect(buildEmail({ ...base, actorJobTitle: "" }).text).toContain("Bo B, Bco");
    expect(buildEmail({ ...base, actorJobTitle: "", actorCompany: "" }).text).not.toContain("Bo B,");
  });

  it("includes the preview as plain quoted text, and nothing when there is none", () => {
    expect(buildEmail({ ...base, preview: "line one\nline two" }).text).toContain("> line one\n> line two");
    expect(buildEmail({ ...base, kind: "connection_accepted", preview: "" }).text).not.toContain("> ");
  });

  it("leaves markup in a message exactly as text", () => {
    const mail = buildEmail({ ...base, kind: "message", preview: "<script>alert(1)</script> https://evil.example" });
    expect(mail.text).toContain("> <script>alert(1)</script> https://evil.example");
  });
});

describe("buildEmail footer", () => {
  const text = buildEmail(base).text;

  it("says why the member gets it, for this kind", () => {
    expect(text).toContain("because you chose to be emailed about: connection requests");
    expect(buildEmail({ ...base, kind: "message" }).text).toContain("because you chose to be emailed about: messages");
  });

  it("lists all four kinds with On or Off for this member", () => {
    expect(text).toContain("Connection requests: On");
    expect(text).toContain("Accepted connections: Off");
    expect(text).toContain("Messages: On");
    expect(text).toContain("Posts from my connections: Off");
  });

  it("has unsubscribe-this-kind, unsubscribe-all and manage links", () => {
    expect(text).toContain(`https://82startup.vercel.app/unsubscribe?code=${CODE}&kind=connection_request`);
    expect(text).toContain(`https://82startup.vercel.app/unsubscribe?code=${CODE}&kind=all`);
    expect(text).toContain("https://82startup.vercel.app/settings");
  });
});

describe("buildEmail headers", () => {
  it("sets List-Unsubscribe and one-click for this kind", () => {
    const { headers } = buildEmail({ ...base, kind: "message" });
    expect(headers["List-Unsubscribe"]).toBe(`<https://82startup.vercel.app/api/unsubscribe?code=${CODE}&kind=message>`);
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
});
