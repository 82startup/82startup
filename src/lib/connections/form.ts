const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NOTE = 200;

function uuid(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "");
  return UUID.test(value) ? value : null;
}

export function parseMemberForm(formData: FormData): string | null {
  return uuid(formData, "member");
}

export function parseIdForm(formData: FormData): string | null {
  return uuid(formData, "id");
}

export function parseSendForm(formData: FormData): { member: string; note: string } | null {
  const member = uuid(formData, "member");
  const note = String(formData.get("note") ?? "").trim();
  if (!member || [...note].length > MAX_NOTE) return null;
  return { member, note };
}
