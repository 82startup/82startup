import type { LumaCalendarEvent, LumaEventDetail } from "./types";

export interface LumaReader {
  listCalendarEvents(): Promise<LumaCalendarEvent[]>;
  getEvent(eventId: string): Promise<LumaEventDetail>;
}

// The only Luma endpoints this app may call. Every request goes through get() below, which only sends GET.
export const READ_PATHS = ["/v1/calendars/events/list", "/v1/events/get"] as const;

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

export function createLumaClient({ apiKey, fetch: fetchImpl = fetch }: Options): LumaReader {
  async function get(path: (typeof READ_PATHS)[number], params: Record<string, string>): Promise<unknown> {
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

  return {
    async listCalendarEvents() {
      const events: LumaCalendarEvent[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < MAX_PAGES; page++) {
        const params: Record<string, string> = { pagination_limit: String(PAGE_SIZE) };
        if (cursor) params.pagination_cursor = cursor;
        const body = (await get("/v1/calendars/events/list", params)) as {
          entries?: LumaCalendarEvent[];
          has_more?: boolean;
          next_cursor?: string;
        };
        if (!body || !Array.isArray(body.entries)) throw new LumaError("Luma list response had an unexpected shape");
        events.push(...body.entries);
        if (!body.has_more) return events;
        if (!body.next_cursor) throw new LumaError("Luma list said there is more but sent no cursor");
        cursor = body.next_cursor;
      }
      throw new LumaError(`Luma list did not end after ${MAX_PAGES} pages`);
    },

    async getEvent(eventId) {
      const body = (await get("/v1/events/get", { event_id: eventId })) as LumaEventDetail;
      if (!body || typeof body !== "object" || !("id" in body)) {
        throw new LumaError("Luma event response had an unexpected shape");
      }
      return body;
    },
  };
}
