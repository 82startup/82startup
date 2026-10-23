import { copy } from "@/lib/copy";

export const ADMIN_MEMBERS_PAGE_SIZE = 50;

// The database says "yes", "no" (switched out) or "no-name" (nothing to list yet).
export function directoryLabel(status: string): string {
  return Object.hasOwn(copy.admin.members.directory, status) ? copy.admin.members.directory[status as keyof typeof copy.admin.members.directory] : "—";
}

// The UTC date, or a dash when there is none or it cannot be read.
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toISOString().slice(0, 10);
}
