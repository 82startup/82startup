import { describe, expect, it } from "vitest";
import { groupSponsorsByTier, moveInOrder } from "./order";

const s = (id: string, tier: string, sort_order: number, name = id) => ({ id, tier, sort_order, name }) as { id: string; tier: "platinum" | "gold" | "silver" | "bronze"; sort_order: number; name: string };

describe("groupSponsorsByTier", () => {
  it("orders the tiers Platinum, Gold, Silver, Bronze, hides empty ones, and orders within a tier by sort order then name", () => {
    const groups = groupSponsorsByTier([s("b1", "bronze", 1), s("g2", "gold", 2, "Zed"), s("g1", "gold", 1), s("g3", "gold", 2, "Alpha"), s("p1", "platinum", 5)]);
    expect(groups.map((g) => g.tier)).toEqual(["platinum", "gold", "bronze"]);
    expect(groups[1].sponsors.map((x) => x.id)).toEqual(["g1", "g3", "g2"]);
  });
  it("puts Diamond right after Platinum and before Gold", () => {
    const groups = groupSponsorsByTier([s("g", "gold", 1), s("d", "diamond", 1), s("p", "platinum", 1), s("s", "silver", 1)]);
    expect(groups.map((g) => g.tier)).toEqual(["platinum", "diamond", "gold", "silver"]);
  });

  it("returns nothing for no sponsors", () => {
    expect(groupSponsorsByTier([])).toEqual([]);
  });
});

describe("moveInOrder", () => {
  const list = [{ id: "a", sort_order: 1 }, { id: "b", sort_order: 2 }, { id: "c", sort_order: 3 }];
  it("swaps the sort order of an entry and its neighbour", () => {
    expect(moveInOrder(list, "b", "up")).toEqual([{ id: "b", sort_order: 1 }, { id: "a", sort_order: 2 }]);
    expect(moveInOrder(list, "b", "down")).toEqual([{ id: "c", sort_order: 2 }, { id: "b", sort_order: 3 }]);
  });
  it("does nothing at the ends or for an unknown id", () => {
    expect(moveInOrder(list, "a", "up")).toEqual([]);
    expect(moveInOrder(list, "c", "down")).toEqual([]);
    expect(moveInOrder(list, "zzz", "up")).toEqual([]);
  });
  it("gives distinct orders even when several entries share one", () => {
    const tied = [{ id: "a", sort_order: 0 }, { id: "b", sort_order: 0 }, { id: "c", sort_order: 0 }];
    const changes = moveInOrder(tied, "c", "up");
    // The whole list is renumbered by position after the swap: a, c, b.
    expect(changes).toEqual([{ id: "a", sort_order: 1 }, { id: "c", sort_order: 2 }, { id: "b", sort_order: 3 }]);
  });
});
