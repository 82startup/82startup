const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Plain lowercase words joined by single dashes: the slug ends up in a redirect, so nothing else is accepted.
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function parseAttendForm(formData: FormData): { id: string; slug: string; value: boolean } | null {
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const value = String(formData.get("value") ?? "");
  if (!UUID.test(id) || !SLUG.test(slug) || (value !== "true" && value !== "false")) return null;
  return { id, slug, value: value === "true" };
}
