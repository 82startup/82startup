import Link from "next/link";
import { copy } from "@/lib/copy";

// The switch between the admin screens, with the current one marked.
export function AdminNav({ current }: { current: "events" | "members" }) {
  const item = (key: "events" | "members", href: string, label: string) => (
    <Link href={href} aria-current={current === key ? "page" : undefined} className={current === key ? "font-semibold underline" : ""}>
      {label}
    </Link>
  );
  return (
    <nav className="mb-4 flex gap-4 text-sm">
      {item("events", "/admin/events", copy.admin.nav.events)}
      {item("members", "/admin/members", copy.admin.nav.members)}
    </nav>
  );
}
