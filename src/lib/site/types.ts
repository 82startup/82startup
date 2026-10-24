// In the order the public page shows them.
export const TIERS = ["platinum", "diamond", "gold", "silver", "bronze"] as const;
export type Tier = (typeof TIERS)[number];

export type Sponsor = {
  id: string;
  name: string;
  tier: Tier;
  website_url: string | null;
  description: string;
  logo_path: string | null;
  sort_order: number;
  visible: boolean;
};

export type Speaker = {
  id: string;
  slug: string;
  name: string;
  job_title: string;
  company: string;
  photo_path: string | null;
  event_ids: string[]; // the events the speaker speaks at
  sort_order: number;
  visible: boolean;
};
