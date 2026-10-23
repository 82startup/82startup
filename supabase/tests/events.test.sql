begin;
select plan(14);

insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url, hidden, removed_from_luma, status) values
  ('evt-visible',   'visible-aaaa',   'Visible',   now() + interval '1 day', 'America/Los_Angeles', 'https://luma.com/aaaa', false, false, 'published'),
  ('evt-hidden',    'hidden-bbbb',    'Hidden',    now(), 'UTC', 'https://luma.com/bbbb', true,  false, 'published'),
  ('evt-removed',   'removed-cccc',   'Removed',   now(), 'UTC', 'https://luma.com/cccc', false, true,  'published'),
  ('evt-cancelled', 'cancelled-dddd', 'Cancelled', now(), 'UTC', 'https://luma.com/dddd', false, false, 'cancelled');

-- logged out
set local role anon;
select is((select count(*) from public.events where slug in ('visible-aaaa', 'hidden-bbbb', 'removed-cccc', 'cancelled-dddd')), 1::bigint, 'logged-out visitors read only the one visible event of ours');
select is((select slug from public.events where slug in ('visible-aaaa', 'hidden-bbbb', 'removed-cccc', 'cancelled-dddd')), 'visible-aaaa', 'and it is the published, shown, still-in-Luma one');
select throws_ok($$insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url) values ('evt-x', 'x', 'X', now(), 'UTC', 'https://luma.com/x')$$, '42501', null, 'logged-out visitors cannot insert');
select throws_ok($$update public.events set title = 'Hacked'$$, '42501', null, 'logged-out visitors cannot update');
select throws_ok($$delete from public.events$$, '42501', null, 'logged-out visitors cannot delete');

-- logged-in member
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is((select count(*) from public.events where slug in ('visible-aaaa', 'hidden-bbbb', 'removed-cccc', 'cancelled-dddd')), 1::bigint, 'a member also reads only the visible event of ours');
select throws_ok($$insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url) values ('evt-y', 'y', 'Y', now(), 'UTC', 'https://luma.com/y')$$, '42501', null, 'a member cannot insert');
select lives_ok($$update public.events set hidden = false$$, 'a member update does not error');
select is((select count(*) from public.events where slug in ('visible-aaaa', 'hidden-bbbb', 'removed-cccc', 'cancelled-dddd')), 1::bigint, 'but it changes nothing: hidden events stay hidden from members');
select throws_ok($$delete from public.events$$, '42501', null, 'a member cannot delete');

-- constraints (as the superuser, like the sync's service role)
reset role;
select throws_ok($$insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url) values ('evt-visible', 'other', 'Dup id', now(), 'UTC', 'https://luma.com/z')$$, '23505', null, 'luma_event_id is unique');
select throws_ok($$insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url) values ('evt-z', 'visible-aaaa', 'Dup slug', now(), 'UTC', 'https://luma.com/z')$$, '23505', null, 'slug is unique');
select throws_ok($$insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url, cover_url) values ('evt-c', 'c', 'C', now(), 'UTC', 'https://luma.com/c', 'http://insecure.example.com/c.jpg')$$, '23514', null, 'cover_url must be https');
select throws_ok($$insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url) values ('evt-l', 'l', 'L', now(), 'UTC', 'javascript:alert(1)')$$, '23514', null, 'luma_url must be https');

select * from finish();
rollback;
