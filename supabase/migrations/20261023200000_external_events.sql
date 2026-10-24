-- Events added by link from other Luma calendars or other websites (for example Eventbrite). They live in the same table as our own
-- calendar's events, marked source = 'external'. The Luma sync only ever looks at source = 'luma' rows. Admins add and change them only
-- through the functions below; nobody can change them directly.
alter table public.events alter column luma_event_id drop not null;
alter table public.events add column source text not null default 'luma' check (source in ('luma', 'external'));
alter table public.events add column external_url text check (external_url is null or (external_url ~ '^https://[^[:space:]]+$' and char_length(external_url) <= 500));
alter table public.events add column external_host text check (external_host is null or char_length(external_host) <= 100);

alter table public.events add constraint events_source_shape check (
  (source = 'luma' and luma_event_id is not null and external_url is null)
  or (source = 'external' and luma_event_id is null and external_url is not null and external_host is not null)
);
-- Limits that apply to the external events (text typed or read from another site); our own calendar's events are not touched.
alter table public.events add constraint events_external_limits check (
  source <> 'external' or (
    char_length(btrim(title)) between 1 and 200
    and char_length(description) <= 2000
    and (venue_name is null or char_length(venue_name) <= 200)
    and (venue_city is null or char_length(venue_city) <= 100)
    and (venue_address is null or char_length(venue_address) <= 300)
  )
);
create unique index events_external_url_key on public.events (external_url) where external_url is not null;

-- Visitors and members read the source and the host (for the "Added from …" label). The original link is the ticket link (luma_url) already.
grant select (source, external_host) on public.events to anon, authenticated;

-- Adds an external event (no id) or changes one (with its id). The page address (slug) is set when it is added and never changes.
create function public.admin_save_external_event(
  p_id uuid, p_slug text, p_title text, p_description text, p_start_at timestamptz, p_end_at timestamptz, p_timezone text,
  p_location_type text, p_venue_name text, p_venue_city text, p_venue_address text, p_cover_url text,
  p_external_url text, p_external_host text, p_hidden boolean
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  if not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'unknown timezone' using errcode = '22023';
  end if;
  if p_end_at is not null and p_end_at < p_start_at then
    raise exception 'the end is before the start' using errcode = '22023';
  end if;
  if p_location_type not in ('online', 'offline', 'unknown') then
    raise exception 'unknown location type' using errcode = '22023';
  end if;

  if p_id is null then
    if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_slug) > 100 then
      raise exception 'bad page address' using errcode = '22023';
    end if;
    insert into public.events (source, slug, title, description, start_at, end_at, timezone, location_type, venue_name, venue_city,
                               venue_address, cover_url, luma_url, external_url, external_host, hidden)
    values ('external', p_slug, btrim(p_title), coalesce(p_description, ''), p_start_at, p_end_at, p_timezone, p_location_type,
            nullif(btrim(coalesce(p_venue_name, '')), ''), nullif(btrim(coalesce(p_venue_city, '')), ''), nullif(btrim(coalesce(p_venue_address, '')), ''),
            p_cover_url, p_external_url, p_external_url, p_external_host, coalesce(p_hidden, false))
    returning id into new_id;
    return new_id;
  end if;

  update public.events set
    title = btrim(p_title), description = coalesce(p_description, ''), start_at = p_start_at, end_at = p_end_at, timezone = p_timezone,
    location_type = p_location_type, venue_name = nullif(btrim(coalesce(p_venue_name, '')), ''), venue_city = nullif(btrim(coalesce(p_venue_city, '')), ''),
    venue_address = nullif(btrim(coalesce(p_venue_address, '')), ''), cover_url = p_cover_url, luma_url = p_external_url,
    external_url = p_external_url, external_host = p_external_host, hidden = coalesce(p_hidden, false)
  where id = p_id and source = 'external'
  returning id into new_id;
  if new_id is null then
    raise exception 'external event not found' using errcode = 'P0002';
  end if;
  return new_id;
end
$$;

-- Deletes an external event for good, with its self-reported attendance (it cascades). Never an event from our own calendar.
create function public.admin_delete_external_event(p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  delete from public.events where id = p_id and source = 'external';
  if not found then
    raise exception 'external event not found' using errcode = 'P0002';
  end if;
end
$$;

revoke all on function public.admin_save_external_event(uuid, text, text, text, timestamptz, timestamptz, text, text, text, text, text, text, text, text, boolean) from public, anon, authenticated, service_role;
revoke all on function public.admin_delete_external_event(uuid) from public, anon, authenticated, service_role;
grant execute on function public.admin_save_external_event(uuid, text, text, text, timestamptz, timestamptz, text, text, text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.admin_delete_external_event(uuid) to authenticated;
