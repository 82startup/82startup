import { describe, expect, it } from "vitest";
import { requestOrigin } from "./request-origin";

function req(host: string, proto = "https") {
  return new Request("http://localhost:3000/auth/callback", { headers: { "x-forwarded-host": host, "x-forwarded-proto": proto } });
}

describe("requestOrigin", () => {
  it("trusts the production domain and its www form", () => {
    expect(requestOrigin(req("82startup.com")).origin).toBe("https://82startup.com");
    expect(requestOrigin(req("www.82startup.com")).origin).toBe("https://www.82startup.com");
  });

  it("keeps trusting vercel.app hosts", () => {
    expect(requestOrigin(req("82startup.vercel.app")).origin).toBe("https://82startup.vercel.app");
  });

  it("ignores an untrusted forwarded host", () => {
    expect(requestOrigin(req("evil.example")).origin).toBe("http://localhost:3000");
    expect(requestOrigin(req("82startup.com.evil.example")).origin).toBe("http://localhost:3000");
  });
});
