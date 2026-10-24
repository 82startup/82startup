import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({
  sendConnectionRequest: vi.fn(),
  respondToRequest: vi.fn(),
  cancelRequest: vi.fn(),
  disconnect: vi.fn(),
  blockMember: vi.fn(),
  unblockMember: vi.fn(),
}));

const { ConnectionPanel } = await import("./connection-panel");

const ID = "11111111-2222-3333-4444-555555555555";
const CID = "99999999-2222-3333-4444-555555555555";
const render = (state: string, note = "") =>
  renderToStaticMarkup(createElement(ConnectionPanel, { memberId: ID, name: "Bo B", state, connectionId: CID, note }));

describe("ConnectionPanel", () => {
  it("shows nothing on your own profile or for an unavailable member", () => {
    expect(render("self")).toBe("");
    expect(render("unavailable")).toBe("");
  });

  it("offers a Connect button that opens a popup with the note box, Send and Cancel, and offers Block", () => {
    const html = render("none");
    expect(html).toContain("<dialog");
    expect(html).not.toContain("<dialog open");
    expect(html).toContain("Invite Bo B to connect");
    expect(html).toContain("<textarea");
    expect(html).toContain('maxLength="200"');
    expect(html).toContain(">Send</button>");
    expect(html).toContain(">Cancel</button>");
    expect(html).toContain(">Connect</button>");
    expect(html).toContain("Block");
    expect(html).toContain(`value="${ID}"`);
  });

  it("keeps the note box out of the page itself: it lives only inside the popup", () => {
    const html = render("none");
    const before = html.slice(0, html.indexOf("<dialog"));
    expect(before).not.toContain("<textarea");
  });

  it("shows Request sent with Cancel for a sent request", () => {
    const html = render("sent");
    expect(html).toContain("Request sent");
    expect(html).toContain("Cancel request");
    expect(html).toContain(`value="${CID}"`);
    expect(html).not.toContain("<textarea");
  });

  it("shows the note with Accept and Decline for a received request", () => {
    const html = render("received", "Meet at Summit");
    expect(html).toContain("Meet at Summit");
    expect(html).toContain("Accept");
    expect(html).toContain("Decline");
  });

  it("escapes a note with markup in it", () => {
    expect(render("received", "<script>x</script>")).toContain("&lt;script&gt;x&lt;/script&gt;");
  });

  it("shows Connected with Disconnect, and Unblock for a blocked member", () => {
    const connected = render("connected");
    expect(connected).toContain("Connected");
    expect(connected).toContain("Disconnect");
    expect(connected).toContain(`href="/messages/${ID}"`);
    const blocked = render("blocked");
    expect(blocked).toContain("You blocked this member.");
    expect(blocked).toContain("Unblock");
    expect(blocked).not.toContain("Connect</button>");
  });
});
