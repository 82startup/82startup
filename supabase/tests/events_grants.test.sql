begin;
select plan(4);

-- The hourly sync writes through the service role. Production does not grant it new tables automatically
-- (local Supabase does), so the migration must grant it explicitly.
select ok(has_table_privilege('service_role', 'public.events', 'SELECT'), 'service_role can select events');
select ok(has_table_privilege('service_role', 'public.events', 'INSERT'), 'service_role can insert events');
select ok(has_table_privilege('service_role', 'public.events', 'UPDATE'), 'service_role can update events');

-- Visitors and members keep read-only access.
select ok(
  not has_table_privilege('authenticated', 'public.events', 'INSERT, UPDATE, DELETE'),
  'members still cannot write events'
);

select * from finish();
rollback;
