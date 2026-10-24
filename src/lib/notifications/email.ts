export type NotificationKind =
  | "connection_request"
  | "connection_accepted"
  | "message"
  | "post"
  | "event_request"
  | "event_request_approved"
  | "event_request_rejected";

// Event request emails are not optional: no setting turns them off and they carry no Unsubscribe link.
const ALWAYS_SENT = ["event_request", "event_request_approved", "event_request_rejected"] as const;
export type RequestKind = (typeof ALWAYS_SENT)[number];
export const isAlwaysSent = (kind: NotificationKind): kind is RequestKind => (ALWAYS_SENT as readonly string[]).includes(kind);

export type EmailInput = {
  kind: NotificationKind;
  actorId: string;
  actorName: string;
  actorJobTitle: string;
  actorCompany: string;
  preview: string;
  prefs: { connect: boolean; messages: boolean };
  unsubscribeCode: string;
  siteUrl: string;
};

type MemberKind = Exclude<NotificationKind, RequestKind>;

const SUBJECT: Record<MemberKind, (name: string) => string> = {
  connection_request: (name) => `${name} wants to connect on 82 Startup`,
  connection_accepted: (name) => `${name} accepted your connection request`,
  message: (name) => `New message from ${name}`,
  post: (name) => `${name} shared a post`,
};

const HEADLINE: Record<MemberKind, (name: string) => string> = {
  connection_request: (name) => `${name} wants to connect with you on 82 Startup.`,
  connection_accepted: (name) => `${name} accepted your connection request on 82 Startup.`,
  message: (name) => `${name} sent you a message on 82 Startup.`,
  post: (name) => `${name} shared a post with their connections on 82 Startup.`,
};

const KIND_LABEL: Record<MemberKind, string> = {
  connection_request: "Connect emails",
  connection_accepted: "Connect emails",
  message: "messages and posts",
  post: "messages and posts",
};

// Requests and accepted connections share the Connect choice; posts are emailed under the Messages choice.
const UNSUBSCRIBE_KIND: Record<MemberKind, string> = {
  connection_request: "connect",
  connection_accepted: "connect",
  message: "message",
  post: "message",
};

// One line, no control characters (a name must never be able to add a header or a line to the subject).
const oneLine = (s: string) => s.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, " ").trim();

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// A plain-text email and the same email as HTML. Everything from other members is shown as text; the only links are ours.
export function buildEmail(i: EmailInput): { subject: string; text: string; html: string; headers: Record<string, string> } {
  const name = oneLine(i.actorName) || "A member";
  if (isAlwaysSent(i.kind)) return buildRequestEmail({ ...i, kind: i.kind }, name);
  const page = i.kind === "connection_request" || i.kind === "connection_accepted" ? "members" : "messages";
  const unsubscribe = (kind: string) => `${i.siteUrl}/unsubscribe?code=${i.unsubscribeCode}&kind=${kind}`;
  const state = (on: boolean) => (on ? "On" : "Off");

  const who = [oneLine(i.actorJobTitle), oneLine(i.actorCompany)].filter(Boolean);
  const whoLine = who.length === 0 ? null : i.actorJobTitle.trim() && i.actorCompany.trim() ? `${name}, ${oneLine(i.actorJobTitle)} at ${oneLine(i.actorCompany)}` : `${name}, ${who[0]}`;

  const lines = [HEADLINE[i.kind](name)];
  if (whoLine) lines.push(whoLine);
  const preview = i.preview.trim();
  if (preview) lines.push("", ...preview.split(/\r?\n/).map((line) => `> ${line}`));
  lines.push("", `Open it: ${i.siteUrl}/${page}/${i.actorId}`);
  const unsubscribeUrl = unsubscribe(UNSUBSCRIBE_KIND[i.kind]);
  const settingsUrl = `${i.siteUrl}/settings`;
  const reason = `You get this email because it is turned on in your email settings: ${KIND_LABEL[i.kind]}.`;
  const settingsLines = [`Connect emails: ${state(i.prefs.connect)}`, `Messages and posts: ${state(i.prefs.messages)}`];
  lines.push(
    "",
    "--",
    reason,
    "",
    "Your email settings:",
    ...settingsLines.map((l) => `  ${l}`),
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
    `Manage email settings: ${settingsUrl}`,
  );

  const p = (text: string, style = "") => `<p style="margin:0 0 12px;${style}">${text}</p>`;
  const link = (href: string, label: string) => `<a href="${escapeHtml(href)}">${label}</a>`;
  const muted = "color:#666;font-size:13px;";
  const html = [
    '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">',
    p(escapeHtml(HEADLINE[i.kind](name))),
    ...(whoLine ? [p(escapeHtml(whoLine))] : []),
    ...(preview
      ? [`<blockquote style="margin:0 0 12px;padding-left:12px;border-left:3px solid #ccc;white-space:pre-wrap">${escapeHtml(preview)}</blockquote>`]
      : []),
    p(link(`${i.siteUrl}/${page}/${i.actorId}`, "Open it")),
    '<hr style="border:none;border-top:1px solid #ddd;margin:20px 0">',
    p(escapeHtml(reason), muted),
    p(`Your email settings:<br>${settingsLines.map(escapeHtml).join("<br>")}`, muted),
    p(`${link(unsubscribeUrl, "Unsubscribe")} | ${link(settingsUrl, "Manage email settings")}`, muted),
    "</div>",
  ].join("\n");

  return {
    subject: SUBJECT[i.kind](name),
    text: lines.join("\n"),
    html,
    headers: {
      "List-Unsubscribe": `<${i.siteUrl}/api/unsubscribe?code=${i.unsubscribeCode}&kind=${UNSUBSCRIBE_KIND[i.kind]}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

const REQUEST = {
  event_request: {
    subject: (name: string) => `${name} suggested an event for 82 Startup`,
    headline: (name: string) => `${name} suggested an event for 82 Startup. It waits for an admin to add it or turn it down.`,
    page: "/admin/events",
    open: "Review the request",
    reason: "You get this email because you are an admin of 82 Startup.",
  },
  event_request_approved: {
    subject: () => "Your event suggestion was added to 82 Startup",
    headline: () => "Thank you. Your event suggestion was added to the 82 Startup events.",
    page: "/events/submit",
    open: "See your suggestions",
    reason: "You get this email because it answers an event you suggested on 82 Startup.",
  },
  event_request_rejected: {
    subject: () => "Your event suggestion was not added",
    headline: () => "Thank you for the suggestion. The admins did not add this event to 82 Startup.",
    page: "/events/submit",
    open: "See your suggestions",
    reason: "You get this email because it answers an event you suggested on 82 Startup.",
  },
} as const;

// Event request emails: always sent, so no Unsubscribe link; the footer says why and links to the email settings.
function buildRequestEmail(i: EmailInput & { kind: RequestKind }, name: string) {
  const r = REQUEST[i.kind];
  const preview = i.preview.trim();
  const openUrl = `${i.siteUrl}${r.page}`;
  const settingsUrl = `${i.siteUrl}/settings`;
  const text = [
    r.headline(name),
    ...(preview ? ["", ...preview.split(/\r?\n/).map((line) => `> ${line}`)] : []),
    "",
    `${r.open}: ${openUrl}`,
    "",
    "--",
    r.reason,
    `Manage email settings: ${settingsUrl}`,
  ].join("\n");

  const p = (body: string, style = "") => `<p style="margin:0 0 12px;${style}">${body}</p>`;
  const link = (href: string, label: string) => `<a href="${escapeHtml(href)}">${label}</a>`;
  const html = [
    '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">',
    p(escapeHtml(r.headline(name))),
    ...(preview
      ? [`<blockquote style="margin:0 0 12px;padding-left:12px;border-left:3px solid #ccc;white-space:pre-wrap">${escapeHtml(preview)}</blockquote>`]
      : []),
    p(link(openUrl, r.open)),
    '<hr style="border:none;border-top:1px solid #ddd;margin:20px 0">',
    p(escapeHtml(r.reason), "color:#666;font-size:13px;"),
    p(link(settingsUrl, "Manage email settings"), "color:#666;font-size:13px;"),
    "</div>",
  ].join("\n");

  return { subject: r.subject(name), text, html, headers: {} as Record<string, string> };
}
