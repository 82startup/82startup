-- Speakers keep only a name, job title, company and photo, and can speak at several events. The one event a speaker could have is moved
-- into a link table first, then the columns that are no longer used (bio, LinkedIn, website, the single event) are removed.
create table public.speaker_events (
  speaker_id uuid not null references public.speakers (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  primary key (speaker_id, event_id)
);
create index speaker_events_event_idx on public.speaker_events (event_id);

insert into public.speaker_events (speaker_id, event_id)
select id, event_id from public.speakers where event_id is not null
on conflict do nothing;

alter table public.speakers drop column bio;
alter table public.speakers drop column linkedin_url;
alter table public.speakers drop column website_url;
alter table public.speakers drop column event_id;

alter table public.speaker_events enable row level security;

-- The links of a speaker are visible to whoever can see that speaker (a hidden speaker's links stay hidden). The speakers' own rules apply
-- inside the subquery. Only admins change links, and only through the function below.
create policy "visitors read links of visible speakers" on public.speaker_events for select to anon
  using (exists (select 1 from public.speakers s where s.id = speaker_id));
create policy "members read links of visible speakers" on public.speaker_events for select to authenticated
  using (exists (select 1 from public.speakers s where s.id = speaker_id));

revoke all on public.speaker_events from public, anon, authenticated, service_role;
grant select on public.speaker_events to anon, authenticated;

-- Replaces the set of events a speaker speaks at, all at once. A repeated event counts once; an event that does not exist, or that was added
-- from another site, is refused.
create function public.admin_set_speaker_events(p_speaker uuid, p_events uuid[])
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  if not exists (select 1 from public.speakers where id = p_speaker) then
    raise exception 'speaker not found' using errcode = 'P0002';
  end if;
  if coalesce(array_length(p_events, 1), 0) > 50 then
    raise exception 'too many events' using errcode = '22023';
  end if;
  -- Speakers are linked only to events from our own calendar, not to ones added by link from other sites.
  if exists (select 1 from public.events ev where ev.id = any(coalesce(p_events, '{}'::uuid[])) and ev.source <> 'luma') then
    raise exception 'only events from our own calendar' using errcode = '22023';
  end if;
  delete from public.speaker_events where speaker_id = p_speaker;
  insert into public.speaker_events (speaker_id, event_id)
  select p_speaker, e from unnest(coalesce(p_events, '{}'::uuid[])) as e group by e;
end
$$;
revoke all on function public.admin_set_speaker_events(uuid, uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.admin_set_speaker_events(uuid, uuid[]) to authenticated;
