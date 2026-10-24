export const TIERS = ["platinum", "gold", "silver", "bronze"] as const;
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
  bio: string;
  photo_path: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  event_id: string | null;
  sort_order: number;
  visible: boolean;
};
