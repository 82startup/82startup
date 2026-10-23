begin;
select plan(7);

insert into auth.users (id, email) values ('dededede-0000-0000-0000-00000000000a', 'a@desc.test');
insert into public.events (id, luma_event_id, slug, title, start_at, timezone, luma_url, description_md, luma_sync_status, luma_sync_error) values
  ('eeeeeeee-7777-0000-0000-000000000001', 'evt-desc-1', 'desc-1', 'With markdown', now() + interval '1 day', 'UTC', 'https://luma.com/d1', E'# Hello\n\n![pic](https://images.lumacdn.com/x.jpg)', 'error', 'boom'),
  ('eeeeeeee-7777-0000-0000-000000000002', 'evt-desc-2', 'desc-2', 'Without',      now() + interval '1 day', 'UTC', 'https://luma.com/d2', default, null, null);
update public.profiles set role = 'admin' where id = 'dededede-0000-0000-0000-00000000000a';

select is((select description_md from public.events where slug = 'desc-2'), '', 'the description_md column defaults to empty');

set local role anon;
select is((select description_md from public.events where slug = 'desc-1'), E'# Hello\n\n![pic](https://images.lumacdn.com/x.jpg)', 'visitors can read it');
select throws_ok($$select luma_sync_error from public.events$$, '42501', null, 'and still cannot read the sync columns');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"dededede-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is((select length(description_md) > 0 from public.events where slug = 'desc-1'), true, 'members can read it too');
select throws_ok($$select luma_sync_error from public.events$$, '42501', null, 'and cannot read the sync columns either');
select is((select description_md from public.admin_events() where slug = 'desc-1'), E'# Hello\n\n![pic](https://images.lumacdn.com/x.jpg)', 'admin_events returns it');

reset role;
select ok(has_column_privilege('anon', 'public.events', 'description_md', 'select') and has_column_privilege('authenticated', 'public.events', 'description_md', 'select'), 'the column grant is explicit for visitors and members');

select * from finish();
rollback;
