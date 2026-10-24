-- Admins make and remove other admins. Every change is logged. The log is closed: only the function writes it.
create table public.role_changes (
  id uuid primary key default gen_random_uuid(),
  changed_by uuid not null references public.profiles (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  old_role public.member_role not null,
  new_role public.member_role not null,
  changed_at timestamptz not null default now()
);
alter table public.role_changes enable row level security;
revoke all on public.role_changes from public, anon, authenticated, service_role;

-- An admin cannot change their own role, so there is always someone who can still make admins.
create function public.admin_set_role(p_member uuid, p_role text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  old public.member_role;
begin
  if not public.is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  if p_role not in ('member', 'admin') then
    raise exception 'unknown role' using errcode = '22023';
  end if;
  if p_member = uid then
    raise exception 'cannot change your own role' using errcode = '22023';
  end if;
  select role into old from public.profiles where id = p_member for update;
  if not found then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  if old::text = p_role then
    return;
  end if;
  update public.profiles set role = p_role::public.member_role where id = p_member;
  insert into public.role_changes (changed_by, member_id, old_role, new_role) values (uid, p_member, old, p_role::public.member_role);
end
$$;

revoke all on function public.admin_set_role(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
