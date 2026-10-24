-- A fifth sponsor tier, Diamond. The list of tiers is a database rule, so it is replaced here (existing rows keep their tier).
alter table public.sponsors drop constraint sponsors_tier_check;
alter table public.sponsors add constraint sponsors_tier_check check (tier in ('platinum', 'diamond', 'gold', 'silver', 'bronze'));
