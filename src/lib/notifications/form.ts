export const UNSUBSCRIBE_KINDS = ["connection_request", "connection_accepted", "message", "post", "all"] as const;
export type UnsubscribeKind = (typeof UNSUBSCRIBE_KINDS)[number];

// Checkboxes send "on" when ticked and nothing when not.
export function parseNotificationForm(formData: FormData) {
  const ticked = (name: string) => formData.get(name) === "on";
  return {
    requests: ticked("connection_requests"),
    accepted: ticked("connection_accepted"),
    messages: ticked("messages"),
    posts: ticked("posts"),
  };
}

const CODE = /^[0-9a-f]{64}$/;

export function parseUnsubscribeParams(code: string | null | undefined, kind: string | null | undefined): { code: string; kind: UnsubscribeKind } | null {
  if (!code || !CODE.test(code) || !kind || !(UNSUBSCRIBE_KINDS as readonly string[]).includes(kind)) return null;
  return { code, kind: kind as UnsubscribeKind };
}
