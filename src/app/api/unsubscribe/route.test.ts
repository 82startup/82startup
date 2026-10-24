import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

const { GET, POST } = await import("./route");

const CODE = "0123456789abcdef".repeat(4);
const url = (code: string, kind: string) => `http://localhost/api/unsubscribe?code=${code}&kind=${kind}`;

beforeEach(() => rpc.mockReset());

describe("POST /api/unsubscribe (the mail program's one-click)", () => {
  it("turns the kind off and answers 200", async () => {
    rpc.mockResolvedValue({ data: "message", error: null });
    const res = await POST(new Request(url(CODE, "message"), { method: "POST", body: "List-Unsubscribe=One-Click" }));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("unsubscribe_with_code", { p_code: CODE, p_kind: "message" });
  });

  it("answers 400 and changes nothing for a malformed or unknown request", async () => {
    expect((await POST(new Request(url("nope", "message"), { method: "POST" }))).status).toBe(400);
    expect((await POST(new Request(url(CODE, "bogus"), { method: "POST" }))).status).toBe(400);
    rpc.mockResolvedValue({ data: null, error: null });
    expect((await POST(new Request(url(CODE, "all"), { method: "POST" }))).status).toBe(400);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/unsubscribe", () => {
  it("changes nothing: it only sends the visitor to the confirmation page", async () => {
    const res = await GET(new Request(url(CODE, "message")));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain(`/unsubscribe?code=${CODE}&kind=message`);
    expect(rpc).not.toHaveBeenCalled();
  });
});
