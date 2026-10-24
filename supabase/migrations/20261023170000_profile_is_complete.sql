-- Whether the caller's profile has the four fields every member must fill: I am, name, job title, company or where they
-- are now. Used by the site to keep an incomplete member on the profile setup screen.
create function public.profile_is_complete()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select p.member_type is not null
     and btrim(p.name, E' \t\r\n') <> ''
     and btrim(p.job_title, E' \t\r\n') <> ''
     and btrim(p.company_name, E' \t\r\n') <> ''
  from public.profiles p
  where (select auth.uid()) is not null and p.id = (select auth.uid())
$$;

revoke all on function public.profile_is_complete() from public, anon, authenticated, service_role;
grant execute on function public.profile_is_complete() to authenticated;
