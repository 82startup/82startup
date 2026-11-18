export type NavItem = { href: string; label: string; marker: string };
export type BoardLink = { slug: string; title: string };

// The community menu in order: Members, Week 2027, one entry per active board, then the rest. Markers are the 01, 02... numbers.
export function buildNavigation(boards: BoardLink[]): NavItem[] {
  const entries: Array<Omit<NavItem, "marker">> = [
    { href: "/members", label: "Members" },
    { href: "/events", label: "Week 2027" },
    ...boards.map(({ slug, title }) => ({ href: `/boards/${slug}`, label: title })),
    { href: "/connections", label: "Connections" },
    { href: "/messages", label: "Messages" },
    { href: "/profile", label: "My profile" },
    { href: "/settings", label: "Settings" },
    { href: "/admin/events", label: "Admin" },
  ];
  return entries.map((entry, index) => ({ ...entry, marker: String(index + 1).padStart(2, "0") }));
}
