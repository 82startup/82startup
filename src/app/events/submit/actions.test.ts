import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const rpc = vi.fn();
const getClaims = vi.fn();
const eventsLookup = vi.fn();
const fetchEventPage = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/external/fetch", () => ({ fetchEventPage }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims },
    rpc,
    from: () => ({ select: () => ({ eq: () => ({ limit: eventsLookup }) }) }),
  }),
}));

const { readEventRequestLink, submitEventRequest, withdrawEventRequest } = await import("./actions");

const ID = "11111111-2222-3333-4444-555555555555";
const LINK = "https://www.eventbrite.com/e/founders-night-123";
const PAGE = `<html><head><script type="application/ld+json">${JSON.stringify({
  "@type": "Event", name: "Founders Night", description: "Come along", startDate: "2027-03-17T18:00:00-07:00",
  location: { "@type": "Place", name: "Fort Mason", address: { "@type": "PostalAddress", addressLocality: "San Francisco" } },
})}</script></head></html>`;
const FIELDS = {
  url: LINK, title: "Founders Night", description: "Come along", timezone: "America/Los_Angeles", start: "2027-03-17T18:00", end: "",
  location_type: "offline", venue_name: "Fort Mason", venue_city: "San Francisco", venue_address: "", cover_url: "",
};
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

beforeEach(() => {
  for (const fn of [revalidatePath, redirect, rpc, getClaims, eventsLookup, fetchEventPage]) fn.mockReset();
  redirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
  getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } } });
  rpc.mockResolvedValue({ error: null });
  eventsLookup.mockResolvedValue({ data: [] });
});

describe("readEventRequestLink", () => {
  it("sends a visitor to log in, without fetching anything", async () => {
    getClaims.mockResolvedValue({ data: null });
    await expect(readEventRequestLink({}, form({ link: LINK }))).rejects.toThrow("NEXT_REDIRECT:/login?next=/events/submit");
    expect(fetchEventPage).not.toHaveBeenCalled();
  });

  it("reads the page into details for the member to check; nothing is saved", async () => {
    fetchEventPage.mockResolvedValue({ ok: true, html: PAGE });
    const state = await readEventRequestLink({}, form({ link: LINK }));
    expect(state.preview).toMatchObject({ url: LINK, host: "eventbrite.com", title: "Founders Night", venueName: "Fort Mason" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses a bad link without fetching, and says so when the event is already on the site", async () => {
    expect((await readEventRequestLink({}, form({ link: "http://x.example/e" }))).error).toMatch(/https:\/\//);
    expect(fetchEventPage).not.toHaveBeenCalled();
    eventsLookup.mockResolvedValue({ data: [{ id: ID }] });
    expect((await readEventRequestLink({}, form({ link: LINK }))).error).toMatch(/already on the site/i);
    expect(fetchEventPage).not.toHaveBeenCalled();
  });

  it("offers to fill the details by hand when the page cannot be read or is not an event page", async () => {
    fetchEventPage.mockResolvedValue({ ok: false, reason: "timeout" });
    const failed = await readEventRequestLink({}, form({ link: LINK }));
    expect(failed.error).toBeTruthy();
    expect(failed.fillByHand).toEqual({ url: LINK, host: "eventbrite.com" });
    fetchEventPage.mockResolvedValue({ ok: true, html: "<html></html>" });
    expect((await readEventRequestLink({}, form({ link: LINK }))).fillByHand).toBeTruthy();
  });
});

describe("submitEventRequest", () => {
  it("sends a visitor to log in", async () => {
    getClaims.mockResolvedValue({ data: null });
    await expect(submitEventRequest({}, form(FIELDS))).rejects.toThrow("NEXT_REDIRECT:/login?next=/events/submit");
  });

  it("stores the checked details and the note with the request", async () => {
    expect(await submitEventRequest({}, form({ ...FIELDS, note: "  please add  " }))).toEqual({ saved: true });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("submit_event_request", {
      p_url: LINK,
      p_host: "eventbrite.com",
      p_note: "please add",
      p_details: {
        url: LINK, host: "eventbrite.com", title: "Founders Night", description: "Come along", timezone: "America/Los_Angeles",
        start: "2027-03-17T18:00", end: "", locationType: "offline", venueName: "Fort Mason", venueCity: "San Francisco", venueAddress: "", coverUrl: "",
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/events/submit");
  });

  it("refuses bad details and a long note without calling the database", async () => {
    const state = await submitEventRequest({}, form({ ...FIELDS, title: "", start: "" }));
    expect(state.errors).toMatchObject({ title: expect.any(String), start: expect.any(String) });
    expect((await submitEventRequest({}, form({ ...FIELDS, note: "x".repeat(301) }))).error).toMatch(/300/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("explains each refusal from the database", async () => {
    const refuse = async (message: string, code: string) => {
      rpc.mockResolvedValueOnce({ error: { message, code } });
      return (await submitEventRequest({}, form(FIELDS))).error;
    };
    expect(await refuse("already on the site", "23505")).toMatch(/already on the site/i);
    expect(await refuse("already requested", "23505")).toMatch(/already waiting/i);
    expect(await refuse("too many waiting", "P0001")).toMatch(/3/);
    expect(await refuse("too many today", "P0001")).toMatch(/tomorrow/i);
    expect(await refuse("profile not complete", "42501")).toMatch(/profile/i);
    expect(await refuse("something else", "XX000")).toMatch(/try again/i);
  });
});

describe("withdrawEventRequest", () => {
  it("withdraws a waiting request", async () => {
    expect(await withdrawEventRequest({}, form({ id: ID }))).toEqual({});
    expect(rpc).toHaveBeenCalledExactlyOnceWith("withdraw_event_request", { p_id: ID });
  });

  it("refuses a bad id without calling the database", async () => {
    expect(await withdrawEventRequest({}, form({ id: "nope" }))).toEqual({ error: expect.any(String) });
    expect(rpc).not.toHaveBeenCalled();
  });
});
