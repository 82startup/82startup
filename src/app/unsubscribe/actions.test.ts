import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

const { confirmUnsubscribe } = await import("./actions");

const CODE = "0123456789abcdef".repeat(4);
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

beforeEach(() => rpc.mockReset());

describe("confirmUnsubscribe", () => {
  it("turns off the kind through the database function and reports which one", async () => {
    rpc.mockResolvedValue({ data: "message", error: null });
    expect(await confirmUnsubscribe({}, form({ code: CODE, kind: "message" }))).toEqual({ done: "message" });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("unsubscribe_with_code", { p_code: CODE, p_kind: "message" });
  });

  it("answers the same neutral way for a bad form, an unknown code or a failure, and never reveals which", async () => {
    const answers = [];
    answers.push(await confirmUnsubscribe({}, form({ code: "nope", kind: "message" })));
    answers.push(await confirmUnsubscribe({}, form({ code: CODE, kind: "bogus" })));
    rpc.mockResolvedValue({ data: null, error: null });
    answers.push(await confirmUnsubscribe({}, form({ code: CODE, kind: "all" })));
    rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    answers.push(await confirmUnsubscribe({}, form({ code: CODE, kind: "all" })));
    for (const answer of answers) expect(answer).toEqual({ invalid: true });
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});
