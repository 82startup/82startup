import { TIERS, type Sponsor, type Tier } from "./types";

type Ordered = { sort_order: number; name: string };

export function groupSponsorsByTier<T extends Ordered & { tier: Tier }>(sponsors: T[]): { tier: Tier; sponsors: T[] }[] {
  return TIERS.map((tier) => ({
    tier,
    sponsors: sponsors.filter((s) => s.tier === tier).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
  })).filter((group) => group.sponsors.length > 0);
}

export type { Sponsor };

// Moves one entry a place up or down in the given (already ordered) list, and returns the new sort order of each entry whose order changed.
// The whole list is renumbered by position so entries that shared an order become distinct.
export function moveInOrder(list: { id: string; sort_order: number }[], id: string, direction: "up" | "down"): { id: string; sort_order: number }[] {
  const from = list.findIndex((item) => item.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= list.length) return [];
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next.map((item, index) => ({ id: item.id, sort_order: index + 1, was: item.sort_order })).filter((item) => item.sort_order !== item.was).map(({ id, sort_order }) => ({ id, sort_order }));
}
