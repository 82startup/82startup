// Only the fields we read, from Luma's API reference (https://public-api.luma.com/openapi.json).
export type LumaAddress = {
  address: string;
  city: string | null;
  region: string | null;
  country: string | null;
  city_state: string | null;
  full_address: string | null;
};

export type LumaCalendarEvent = {
  platform: string;
  id: string;
  start_at: string;
  end_at?: string;
  timezone: string;
  name: string;
  cover_url?: string;
  url: string;
  visibility?: string;
  location_type?: string;
  location_visibility?: string;
  geo_address_json?: LumaAddress | null;
};

export type LumaEventDetail = LumaCalendarEvent & {
  description?: string;
  guest_counts?: { approved?: { guests?: number } };
};

// One entry of an event's guest list. We read the email only to match it to a member; it is never stored.
export type LumaGuest = { user_email?: string; approval_status?: string };
