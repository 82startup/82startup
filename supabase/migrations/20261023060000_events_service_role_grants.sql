-- The production project does not grant the service role access to new tables automatically (local Supabase does),
-- so the hourly Luma sync failed with "permission denied for table events". Grant exactly what the sync uses.
grant select, insert, update on public.events to service_role;
