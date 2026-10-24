export type NotificationKind = "connection_request" | "connection_accepted" | "message" | "post";

export type EmailInput = {
  kind: NotificationKind;
  actorId: string;
  actorName: string;
  actorJobTitle: string;
  actorCompany: string;
  preview: string;
  prefs: { requests: boolean; accepted: boolean; messages: boolean; posts: boolean };
  unsubscribeCode: string;
  siteUrl: string;
};

const SUBJECT: Record<NotificationKind, (name: string) => string> = {
  connection_request: (name) => `${name} wants to connect on 82 Startup`,
  connection_accepted: (name) => `${name} accepted your connection request`,
  message: (name) => `New message from ${name}`,
  post: (name) => `${name} shared a post`,
};

const HEADLINE: Record<NotificationKind, (name: string) => string> = {
  connection_request: (name) => `${name} wants to connect with you on 82 Startup.`,
  connection_accepted: (name) => `${name} accepted your connection request on 82 Startup.`,
  message: (name) => `${name} sent you a message on 82 Startup.`,
  post: (name) => `${name} shared a post with their connections on 82 Startup.`,
};

const KIND_LABEL: Record<NotificationKind, string> = {
  connection_request: "connection requests",
  connection_accepted: "accepted connections",
  message: "messages",
  post: "posts from my connections",
};

// One line, no control characters (a name must never be able to add a header or a line to the subject).
const oneLine = (s: string) => s.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, " ").trim();

// A plain-text email. Everything from other members is shown as text; the only links are ours.
export function buildEmail(i: EmailInput): { subject: string; text: string; headers: Record<string, string> } {
  const name = oneLine(i.actorName) || "A member";
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
  lines.push(
    "",
    "--",
    `You get this email because you chose to be emailed about: ${KIND_LABEL[i.kind]}.`,
    "",
    "Your email settings:",
    `  Connection requests: ${state(i.prefs.requests)}`,
    `  Accepted connections: ${state(i.prefs.accepted)}`,
    `  Messages: ${state(i.prefs.messages)}`,
    `  Posts from my connections: ${state(i.prefs.posts)}`,
    "",
    `Unsubscribe from these emails: ${unsubscribe(i.kind)}`,
    `Unsubscribe from all emails: ${unsubscribe("all")}`,
    `Manage email settings: ${i.siteUrl}/settings`,
  );

  return {
    subject: SUBJECT[i.kind](name),
    text: lines.join("\n"),
    headers: {
      "List-Unsubscribe": `<${i.siteUrl}/api/unsubscribe?code=${i.unsubscribeCode}&kind=${i.kind}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
