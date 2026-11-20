export type NavItem = { href: string; label: string; marker: string; shortLabel?: string };
export type BoardLink = { slug: string; title: string };

// Mobile tab label for a board: a leading "Startup " is dropped ("Startup Showcase" -> "Showcase").
function shortBoardLabel(title: string): string | undefined {
  const short = title.replace(/^Startup\s+/i, "");
  return short && short !== title ? short : undefined;
}

// The community menu in order: Members, Week 2027, one entry per active board, then the rest. Markers are the 01, 02... numbers.
export function buildNavigation(boards: BoardLink[]): NavItem[] {
  const entries: Array<Omit<NavItem, "marker">> = [
    { href: "/members", label: "Members" },
    { href: "/events", label: "Week 2027", shortLabel: "Week" },
    ...boards.map(({ slug, title }) => ({ href: `/boards/${slug}`, label: title, shortLabel: shortBoardLabel(title) })),
    { href: "/connections", label: "Connections" },
    { href: "/messages", label: "Messages" },
    { href: "/profile", label: "My profile" },
    { href: "/settings", label: "Settings" },
    { href: "/admin/events", label: "Admin" },
  ];
  return entries.map((entry, index) => ({ ...entry, marker: String(index + 1).padStart(2, "0") }));
}
