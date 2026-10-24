const MAX_POST = 2000;

export function parsePostForm(formData: FormData): string | null {
  const body = String(formData.get("body") ?? "").trim();
  return body === "" || [...body].length > MAX_POST ? null : body;
}
