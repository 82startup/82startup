const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_MESSAGE = 2000;

function member(formData: FormData): string | null {
  const value = String(formData.get("member") ?? "");
  return UUID.test(value) ? value : null;
}

export function parseMarkReadForm(formData: FormData): string | null {
  return member(formData);
}

export function parseSendMessageForm(formData: FormData): { member: string; body: string } | null {
  const to = member(formData);
  const body = String(formData.get("body") ?? "").trim();
  if (!to || body === "" || [...body].length > MAX_MESSAGE) return null;
  return { member: to, body };
}
