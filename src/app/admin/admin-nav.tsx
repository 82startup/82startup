import Link from "next/link";
import { copy } from "@/lib/copy";

// The switch between the admin screens, with the current one marked.
export function AdminNav({ current, pending = 0 }: { current: "events" | "members" | "sponsors" | "speakers"; pending?: number }) {
  const item = (key: "events" | "members" | "sponsors" | "speakers", href: string, label: string) => (
    <Link href={href} aria-current={current === key ? "page" : undefined} className={current === key ? "font-semibold underline" : ""}>
      {label}
    </Link>
  );
  return (
    <nav className="mb-4 flex gap-4 text-sm">
      {item("events", "/admin/events", pending > 0 ? `${copy.admin.nav.events} (${pending})` : copy.admin.nav.events)}
      {item("members", "/admin/members", copy.admin.nav.members)}
      {item("sponsors", "/admin/sponsors", copy.admin.nav.sponsors)}
      {item("speakers", "/admin/speakers", copy.admin.nav.speakers)}
    </nav>
  );
}
