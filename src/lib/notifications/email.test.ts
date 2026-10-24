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
  prefs: { connect: true, messages: true },
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
  const { text, html } = buildEmail({ ...base, prefs: { connect: false, messages: true } });

  it("says why the member gets it, for this kind", () => {
    expect(text).toContain("because it is turned on in your email settings: Connect emails");
    expect(buildEmail({ ...base, kind: "connection_accepted" }).text).toContain("settings: Connect emails");
    expect(buildEmail({ ...base, kind: "message" }).text).toContain("turned on in your email settings: messages and posts");
    expect(buildEmail({ ...base, kind: "post" }).text).toContain("turned on in your email settings: messages and posts");
  });

  it("lists both choices with On or Off for this member", () => {
    expect(text).toContain("Connect emails: Off");
    expect(text).toContain("Messages and posts: On");
    expect(text).not.toContain("Accepted connections");
  });

  it("text version has the unsubscribe and manage links as addresses", () => {
    expect(text).toContain(`Unsubscribe: https://82startup.vercel.app/unsubscribe?code=${CODE}&kind=connect`);
    expect(text).toContain("Manage email settings: https://82startup.vercel.app/settings");
    expect(text).not.toContain("kind=all");
  });

  it("html version shows the words Unsubscribe | Manage email settings as links", () => {
    expect(html).toContain(`<a href="https://82startup.vercel.app/unsubscribe?code=${CODE}&amp;kind=connect">Unsubscribe</a> | <a href="https://82startup.vercel.app/settings">Manage email settings</a>`);
  });

  it("both connection kinds unsubscribe from Connect", () => {
    for (const kind of ["connection_request", "connection_accepted"] as const) {
      const mail = buildEmail({ ...base, kind });
      expect(mail.text).toContain("kind=connect");
      expect(mail.headers["List-Unsubscribe"]).toContain("kind=connect>");
    }
  });
});

describe("buildEmail html", () => {
  it("escapes everything that comes from other members, so only our own links are clickable", () => {
    const mail = buildEmail({
      ...base,
      kind: "message",
      actorName: "<b>Bo</b>",
      actorCompany: 'A"co',
      preview: '<script>alert(1)</script> <a href="https://evil.example">x</a> & more',
    });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<b>Bo");
    expect(mail.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(mail.html).toContain("&amp; more");
    const links = [...mail.html.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
    expect(links.every((l) => l.startsWith("https://82startup.vercel.app/"))).toBe(true);
  });
});

describe("buildEmail for a post", () => {
  it("unsubscribes from messages (posts share that choice), in the link and in the header", () => {
    const mail = buildEmail({ ...base, kind: "post" });
    expect(mail.text).toContain(`unsubscribe?code=${CODE}&kind=message`);
    expect(mail.text).not.toContain("kind=post");
    expect(mail.headers["List-Unsubscribe"]).toContain("kind=message>");
  });
});

describe("buildEmail headers", () => {
  it("sets List-Unsubscribe and one-click for this kind", () => {
    const { headers } = buildEmail({ ...base, kind: "message" });
    expect(headers["List-Unsubscribe"]).toBe(`<https://82startup.vercel.app/api/unsubscribe?code=${CODE}&kind=message>`);
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
});

describe("buildEmail for event requests", () => {
  const request = { ...base, kind: "event_request" as const, actorName: "Mia M", preview: "Demo Night\nplease add" };

  it("tells an admin who asked, shows the title and note, and links to the requests", () => {
    const mail = buildEmail(request);
    expect(mail.subject).toBe("Mia M suggested an event for 82 Startup");
    expect(mail.text).toContain("Demo Night");
    expect(mail.text).toContain("> please add");
    expect(mail.text).toContain("https://82startup.vercel.app/admin/events");
    expect(mail.html).toContain('href="https://82startup.vercel.app/admin/events"');
  });

  it("has no Unsubscribe link and says why admins get it, with a link to the email settings", () => {
    const mail = buildEmail(request);
    expect(mail.text).not.toMatch(/unsubscribe/i);
    expect(mail.html).not.toMatch(/unsubscribe/i);
    expect(mail.text).toContain("because you are an admin");
    expect(mail.text).toContain("https://82startup.vercel.app/settings");
    expect(mail.headers).toEqual({});
  });

  it("tells the member the event was added, with the event title, and links to their requests", () => {
    const mail = buildEmail({ ...base, kind: "event_request_approved", preview: "Demo Night" });
    expect(mail.subject).toBe("Your event suggestion was added to 82 Startup");
    expect(mail.text).toContain("Demo Night");
    expect(mail.text).toContain("https://82startup.vercel.app/events/submit");
    expect(mail.text).not.toMatch(/unsubscribe/i);
    expect(mail.headers).toEqual({});
  });

  it("tells the member it was not added, with the reason when there is one", () => {
    const withReason = buildEmail({ ...base, kind: "event_request_rejected", preview: "Not our kind of event" });
    expect(withReason.subject).toBe("Your event suggestion was not added");
    expect(withReason.text).toContain("> Not our kind of event");
    const without = buildEmail({ ...base, kind: "event_request_rejected", preview: "" });
    expect(without.text).not.toContain(">");
  });

  it("shows text from members only as text in the HTML", () => {
    const mail = buildEmail({ ...request, preview: "<script>x</script>" });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });
});
