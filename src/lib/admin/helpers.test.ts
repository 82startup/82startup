import { describe, expect, it } from "vitest";
import { eventFlags, lastSyncedAt, parseSwitch } from "./helpers";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

const ID = "11111111-2222-3333-4444-555555555555";

describe("parseSwitch", () => {
  it("reads a uuid and true or false", () => {
    expect(parseSwitch(form({ id: ID, value: "true" }))).toEqual({ id: ID, value: true });
    expect(parseSwitch(form({ id: ID, value: "false" }))).toEqual({ id: ID, value: false });
  });

  it("rejects a missing or malformed id", () => {
    for (const id of ["", "abc", `${ID}x`, "1; drop table events", ID.slice(1)]) {
      expect(parseSwitch(form({ id, value: "true" }))).toBeNull();
    }
    expect(parseSwitch(form({ value: "true" }))).toBeNull();
  });

  it("rejects any value other than exactly true or false", () => {
    for (const value of ["", "yes", "1", "TRUE", "on"]) {
      expect(parseSwitch(form({ id: ID, value }))).toBeNull();
    }
    expect(parseSwitch(form({ id: ID }))).toBeNull();
  });
});

describe("eventFlags", () => {
  const clean = { hidden: false, removed_from_luma: false, luma_sync_status: "ok" as const };

  it("is empty for a clean event", () => {
    expect(eventFlags(clean)).toEqual([]);
    expect(eventFlags({ ...clean, luma_sync_status: null })).toEqual([]);
  });

  it("lists each reason, always in the same order", () => {
    expect(eventFlags({ ...clean, hidden: true })).toEqual(["hidden"]);
    expect(eventFlags({ ...clean, removed_from_luma: true })).toEqual(["removed"]);
    expect(eventFlags({ ...clean, luma_sync_status: "error" })).toEqual(["sync-error"]);
    expect(eventFlags({ hidden: true, removed_from_luma: true, luma_sync_status: "error" })).toEqual(["hidden", "removed", "sync-error"]);
  });
});

describe("lastSyncedAt", () => {
  it("returns the latest sync time", () => {
    expect(
      lastSyncedAt([{ luma_synced_at: "2026-10-23T10:00:00Z" }, { luma_synced_at: "2026-10-23T12:00:00Z" }, { luma_synced_at: null }]),
    ).toBe("2026-10-23T12:00:00Z");
  });
  it("is null when nothing has synced", () => {
    expect(lastSyncedAt([])).toBeNull();
    expect(lastSyncedAt([{ luma_synced_at: null }])).toBeNull();
  });
});
