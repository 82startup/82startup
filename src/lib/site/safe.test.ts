import { describe, expect, it, vi } from "vitest";
import { safely } from "./safe";

describe("safely", () => {
  it("returns the value when the read works", async () => {
    expect(await safely(async () => [1, 2], [])).toEqual([1, 2]);
  });

  it("returns the fallback when the read fails, and logs only the kind of failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("relation public.sponsors does not exist for secret@x.test");
    error.name = "ReadError";
    expect(await safely(async () => Promise.reject(error), ["fallback"])).toEqual(["fallback"]);
    expect(JSON.stringify(log.mock.calls)).toContain("ReadError");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret@x.test");
    log.mockRestore();
  });

  it("also handles a read that throws before returning a promise", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await safely(() => {
      throw new Error("boom");
    }, null)).toBeNull();
  });
});
