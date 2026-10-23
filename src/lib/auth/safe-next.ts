export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001F\u007F]/.test(next)) {
    return "/";
  }
  return next;
}
