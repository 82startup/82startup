import { describe, expect, it } from "vitest";
import { eventsForSpeakers } from "./speaker-events";

const ev = (id: string, source: "luma" | "external", start: string) => ({ id, title: id, source, start_at: start });

describe("eventsForSpeakers", () => {
  it("offers only events from our own calendar, not ones added from other sites", () => {
    const list = eventsForSpeakers([ev("ours", "luma", "2027-03-01T00:00:00Z"), ev("theirs", "external", "2027-03-02T00:00:00Z")]);
    expect(list.map((e) => e.id)).toEqual(["ours"]);
  });
  it("lists the newest first, and gives only the id and title", () => {
    const list = eventsForSpeakers([ev("a", "luma", "2027-01-01T00:00:00Z"), ev("c", "luma", "2027-03-01T00:00:00Z"), ev("b", "luma", "2027-02-01T00:00:00Z")]);
    expect(list.map((e) => e.id)).toEqual(["c", "b", "a"]);
    expect(Object.keys(list[0]).sort()).toEqual(["id", "title"]);
  });
  it("gives an empty list when there are no events of ours", () => {
    expect(eventsForSpeakers([])).toEqual([]);
    expect(eventsForSpeakers([ev("x", "external", "2027-01-01T00:00:00Z")])).toEqual([]);
  });
});
