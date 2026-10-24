export type Mail = { to: string; subject: string; text: string; headers: Record<string, string> };

export interface MailSender {
  send(mail: Mail): Promise<void>;
}

// Errors carry only a status or a plain word, never the answer text or the address (they could contain the address).
class MailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailError";
  }
}

type Options = { from: string; fetch?: typeof fetch };

// Production: Resend's web API with a server-only key.
export function createResendSender({ apiKey, from, fetch: fetchImpl = fetch }: Options & { apiKey: string }): MailSender {
  return {
    async send(mail) {
      let res: Response;
      try {
        res = await fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
          body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text, headers: mail.headers }),
        });
      } catch {
        throw new MailError("mail request failed (network)");
      }
      if (!res.ok) throw new MailError(`mail request failed with status ${res.status}`);
    },
  };
}

// Local development: the local mailbox (Mailpit) that already catches sign-in emails; open it to read what would be sent.
export function createMailpitSender({ baseUrl, from, fetch: fetchImpl = fetch }: Options & { baseUrl: string }): MailSender {
  const match = /^(.*?)\s*<(.+)>$/.exec(from);
  const sender = match ? { Name: match[1], Email: match[2] } : { Email: from };
  return {
    async send(mail) {
      let res: Response;
      try {
        res = await fetchImpl(`${baseUrl}/api/v1/send`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ From: sender, To: [{ Email: mail.to }], Subject: mail.subject, Text: mail.text, Headers: mail.headers }),
        });
      } catch {
        throw new MailError("local mailbox request failed (network)");
      }
      if (!res.ok) throw new MailError(`local mailbox request failed with status ${res.status}`);
    },
  };
}
