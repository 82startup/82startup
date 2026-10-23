import type { LumaCalendarEvent, LumaEventDetail, LumaGuest } from "./types";

export interface LumaReader {
  listCalendarEvents(): Promise<LumaCalendarEvent[]>;
  getEvent(eventId: string): Promise<LumaEventDetail>;
  // Emails of the guests Luma lists as approved for one event. Read in full or not at all.
  listApprovedGuestEmails(eventId: string): Promise<string[]>;
}

// The only Luma endpoints this app may call. Every request goes through get() below, which only sends GET.
export const READ_PATHS = ["/v1/calendars/events/list", "/v1/events/get", "/v1/events/guests/list"] as const;

const BASE_URL = "https://public-api.luma.com";
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

export class LumaError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "LumaError";
    this.status = status;
  }
}

type Options = { apiKey: string; fetch?: typeof fetch };
type ReadPath = (typeof READ_PATHS)[number];

export function createLumaClient({ apiKey, fetch: fetchImpl = fetch }: Options): LumaReader {
  async function get(path: ReadPath, params: Record<string, string>): Promise<unknown> {
    const url = new URL(path, BASE_URL);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: "GET",
        headers: { "x-luma-api-key": apiKey, accept: "application/json" },
        cache: "no-store",
      });
    } catch {
      throw new LumaError(`Luma request to ${path} failed (network)`);
    }
    if (!res.ok) throw new LumaError(`Luma request to ${path} failed with status ${res.status}`, res.status);
    return res.json();
  }

  // Follows next_cursor until has_more is false. Throws rather than return a partial list.
  async function listAll<T>(path: ReadPath, params: Record<string, string>): Promise<T[]> {
    const items: T[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const query: Record<string, string> = { ...params, pagination_limit: String(PAGE_SIZE) };
      if (cursor) query.pagination_cursor = cursor;
      const body = (await get(path, query)) as { entries?: T[]; has_more?: boolean; next_cursor?: string };
      if (!body || !Array.isArray(body.entries)) throw new LumaError(`Luma ${path} response had an unexpected shape`);
      items.push(...body.entries);
      if (!body.has_more) return items;
      if (!body.next_cursor) throw new LumaError(`Luma ${path} said there is more but sent no cursor`);
      cursor = body.next_cursor;
    }
    throw new LumaError(`Luma ${path} did not end after ${MAX_PAGES} pages`);
  }

  return {
    listCalendarEvents() {
      return listAll<LumaCalendarEvent>("/v1/calendars/events/list", {});
    },

    async getEvent(eventId) {
      const body = (await get("/v1/events/get", { event_id: eventId })) as LumaEventDetail;
      if (!body || typeof body !== "object" || !("id" in body)) {
        throw new LumaError("Luma event response had an unexpected shape");
      }
      return body;
    },

    async listApprovedGuestEmails(eventId) {
      const guests = await listAll<LumaGuest>("/v1/events/guests/list", { event_id: eventId, approval_status: "approved" });
      return guests.map((g) => g.user_email).filter((email): email is string => typeof email === "string" && email.length > 0);
    },
  };
}
