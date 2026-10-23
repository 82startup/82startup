export type PublicEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string | null;
  timezone: string;
  location_type: string;
  venue_name: string | null;
  venue_city: string | null;
  venue_address: string | null;
  cover_url: string | null;
  luma_url: string;
  featured: boolean;
};
