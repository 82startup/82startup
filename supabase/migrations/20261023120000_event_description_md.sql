-- Luma's formatted (markdown) description, with its pictures and formatting. The plain-text description stays for the share
-- preview and as the fallback. The public column grant is a list, so the new column is added to it explicitly.
alter table public.events add column description_md text not null default '';

grant select (description_md) on public.events to anon, authenticated;
