begin;
select plan(68);

-- A (viewer), B, C, D (left the directory), E (no name), F, G (blocked by nobody, used for cascade).
insert into auth.users (id, email) values
  ('ffffffff-5555-0000-0000-000000000001', 'cn1@x.test'),
  ('ffffffff-5555-0000-0000-000000000002', 'cn2@x.test'),
  ('ffffffff-5555-0000-0000-000000000003', 'cn3@x.test'),
  ('ffffffff-5555-0000-0000-000000000004', 'cn4@x.test'),
  ('ffffffff-5555-0000-0000-000000000005', 'cn5@x.test'),
  ('ffffffff-5555-0000-0000-000000000006', 'cn6@x.test'),
  ('ffffffff-5555-0000-0000-000000000007', 'cn7@x.test');
update public.profiles set name = 'Ann A' where id = 'ffffffff-5555-0000-0000-000000000001';
update public.profiles set name = 'Bo B', job_title = 'CEO', company_name = 'Bco' where id = 'ffffffff-5555-0000-0000-000000000002';
update public.profiles set name = 'Cy C' where id = 'ffffffff-5555-0000-0000-000000000003';
update public.profiles set name = 'Dee D', show_in_directory = false where id = 'ffffffff-5555-0000-0000-000000000004';
update public.profiles set name = '' where id = 'ffffffff-5555-0000-0000-000000000005';
update public.profiles set name = 'Fay F' where id = 'ffffffff-5555-0000-0000-000000000006';
update public.profiles set name = 'Gus G' where id = 'ffffffff-5555-0000-0000-000000000007';

-- ===== logged out
set local role anon;
select throws_ok($$select public.send_connection_request('ffffffff-5555-0000-0000-000000000002', '')$$, '42501', null, 'visitors cannot send a request');
select throws_ok($$select public.connection_state('ffffffff-5555-0000-0000-000000000002')$$, '42501', null, 'visitors cannot read a state');

-- ===== A: the tables are closed, the rules on who can be asked
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok($$select * from public.connections$$, '42501', null, 'members cannot read the connections table');
select throws_ok($$select * from public.member_blocks$$, '42501', null, 'members cannot read the blocks table');
select throws_ok($$insert into public.connections (requester_id, addressee_id) values ('ffffffff-5555-0000-0000-000000000001', 'ffffffff-5555-0000-0000-000000000002')$$, '42501', null, 'members cannot write the connections table');
select throws_ok($$select public.are_connected('ffffffff-5555-0000-0000-000000000001', 'ffffffff-5555-0000-0000-000000000002')$$, '42501', null, 'the internal helper is not callable by members');
select throws_ok($$select public.send_connection_request('ffffffff-5555-0000-0000-000000000001', '')$$, '22023', null, 'not with yourself');
select throws_ok($$select public.send_connection_request('ffffffff-5555-0000-0000-000000000004', '')$$, 'P0002', null, 'not with a member who left the directory');
select throws_ok($$select public.send_connection_request('ffffffff-5555-0000-0000-000000000005', '')$$, 'P0002', null, 'not with a member without a name');
select throws_ok($$select public.send_connection_request('ffffffff-5555-0000-0000-0000000000ff', '')$$, 'P0002', null, 'not with someone who does not exist');
select throws_ok($$select public.send_connection_request('ffffffff-5555-0000-0000-000000000002', repeat('x', 201))$$, '22001', null, 'a note over 200 characters is refused');
select is(public.send_connection_request('ffffffff-5555-0000-0000-000000000002', '  hi  '), 'pending', 'a request is pending');
select is(public.send_connection_request('ffffffff-5555-0000-0000-000000000002', 'again'), 'pending', 'sending again changes nothing');
select is(public.connection_state('ffffffff-5555-0000-0000-000000000002'), 'sent', 'the sender sees it as sent');
select is(public.connection_state('ffffffff-5555-0000-0000-000000000001'), 'self', 'your own profile is self');
select is(public.connection_state('ffffffff-5555-0000-0000-000000000003'), 'none', 'no relation is none');
select is(public.connection_state('ffffffff-5555-0000-0000-000000000004'), 'unavailable', 'a member who left the directory is unavailable');
select is((select count(*) from public.my_connection_lists() where kind = 'sent'), 1::bigint, 'one sent request is listed');

-- ===== B: sees it, with the trimmed note; only the addressee can respond
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000002","role":"authenticated"}', true);
select is(public.connection_state('ffffffff-5555-0000-0000-000000000001'), 'received', 'the addressee sees it as received');
select is(public.pending_request_count(), 1, 'and one waiting request');
select is((select note from public.my_connection_lists() where kind = 'received'), 'hi', 'with the note, trimmed');
select is((select name from public.my_connection_lists() where kind = 'received'), 'Ann A', 'and who it is from');
select is(public.respond_connection_request((select connection_id from public.my_connection_lists() where kind = 'received'), true), 'accepted', 'accepting connects');
select is(public.connection_state('ffffffff-5555-0000-0000-000000000001'), 'connected', 'B sees connected');
select is(public.pending_request_count(), 0, 'no more waiting requests');

-- ===== A sees it too, and can disconnect
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.connection_state('ffffffff-5555-0000-0000-000000000002'), 'connected', 'A sees connected');
select is((select company_name from public.my_connection_lists() where kind = 'connected'), 'Bco', 'the connection is listed with company');
select is(public.send_connection_request('ffffffff-5555-0000-0000-000000000002', ''), 'connected', 'asking someone you are connected with changes nothing');
select lives_ok($$select public.remove_connection('ffffffff-5555-0000-0000-000000000002')$$, 'either side can disconnect');
select is(public.connection_state('ffffffff-5555-0000-0000-000000000002'), 'none', 'then there is no relation');
select lives_ok($$select public.remove_connection('ffffffff-5555-0000-0000-000000000002')$$, 'disconnecting twice is harmless');

-- ===== mutual request becomes a connection
select is(public.send_connection_request('ffffffff-5555-0000-0000-000000000002', ''), 'pending', 'A asks B again');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000002","role":"authenticated"}', true);
select is(public.send_connection_request('ffffffff-5555-0000-0000-000000000001', ''), 'connected', 'B asking A accepts the open request');
reset role;
select is((select count(*) from public.connections where least(requester_id, addressee_id) = 'ffffffff-5555-0000-0000-000000000001' and greatest(requester_id, addressee_id) = 'ffffffff-5555-0000-0000-000000000002'), 1::bigint, 'still one row for the pair');

-- ===== decline, then a 30 day wait for the requester
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.send_connection_request('ffffffff-5555-0000-0000-000000000006', 'hello'), 'pending', 'A asks F');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000006","role":"authenticated"}', true);
select is(public.respond_connection_request((select connection_id from public.my_connection_lists() where kind = 'received'), false), 'declined', 'F declines');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.connection_state('ffffffff-5555-0000-0000-000000000006'), 'none', 'A just sees no pending request');
select throws_ok($$select public.send_connection_request('ffffffff-5555-0000-0000-000000000006', '')$$, 'P0001', null, 'A cannot ask again within 30 days');
reset role;
update public.connections set responded_at = now() - interval '31 days' where addressee_id = 'ffffffff-5555-0000-0000-000000000006';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.send_connection_request('ffffffff-5555-0000-0000-000000000006', ''), 'pending', 'after 30 days A may ask again');

-- ===== cancel, and who may respond or cancel
select set_config('t.cid', (select connection_id::text from public.my_connection_lists() where kind = 'sent'), false);
select throws_ok($$select public.respond_connection_request(current_setting('t.cid')::uuid, true)$$, 'P0002', null, 'the sender cannot respond to their own request');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000007","role":"authenticated"}', true);
select throws_ok($$select public.respond_connection_request(current_setting('t.cid')::uuid, true)$$, 'P0002', null, 'a third member cannot respond');
select throws_ok($$select public.cancel_connection_request(current_setting('t.cid')::uuid)$$, 'P0002', null, 'a third member cannot cancel');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000006","role":"authenticated"}', true);
select throws_ok($$select public.cancel_connection_request(current_setting('t.cid')::uuid)$$, 'P0002', null, 'the addressee cannot cancel, only decline');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok($$select public.cancel_connection_request(current_setting('t.cid')::uuid)$$, 'the sender can cancel');
select is(public.connection_state('ffffffff-5555-0000-0000-000000000006'), 'none', 'after a cancel there is no relation');
select throws_ok($$select public.respond_connection_request(current_setting('t.cid')::uuid, true)$$, 'P0002', null, 'a cancelled request cannot be answered');

-- ===== block: A and B are connected; B blocks A
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok($$select public.block_member('ffffffff-5555-0000-0000-000000000002')$$, '22023', null, 'you cannot block yourself');
select lives_ok($$select public.block_member('ffffffff-5555-0000-0000-000000000001')$$, 'B blocks A');
select lives_ok($$select public.block_member('ffffffff-5555-0000-0000-000000000001')$$, 'blocking twice is harmless');
select is(public.connection_state('ffffffff-5555-0000-0000-000000000001'), 'blocked', 'B sees A as blocked');
select is((select count(*) from public.my_connection_lists() where kind = 'connected'), 0::bigint, 'the connection ended');
select is((select count(*) from public.my_connection_lists() where kind = 'blocked'), 1::bigint, 'and A is on the blocked list');
select throws_ok($$select public.send_connection_request('ffffffff-5555-0000-0000-000000000001', '')$$, 'P0002', null, 'B cannot ask a member B blocked');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.connection_state('ffffffff-5555-0000-0000-000000000002'), 'unavailable', 'A just sees B as unavailable');
select throws_ok($$select public.send_connection_request('ffffffff-5555-0000-0000-000000000002', '')$$, 'P0002', null, 'A cannot ask B');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000002","role":"authenticated"}', true);
select lives_ok($$select public.unblock_member('ffffffff-5555-0000-0000-000000000001')$$, 'B unblocks A');
select is(public.connection_state('ffffffff-5555-0000-0000-000000000001'), 'none', 'nothing is restored');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.send_connection_request('ffffffff-5555-0000-0000-000000000002', ''), 'pending', 'A may ask again after the unblock');

-- ===== leaving the directory keeps existing connections but closes the door to new requests
select is(public.send_connection_request('ffffffff-5555-0000-0000-000000000003', ''), 'pending', 'A asks C');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000003","role":"authenticated"}', true);
select is(public.respond_connection_request((select connection_id from public.my_connection_lists() where kind = 'received'), true), 'accepted', 'C accepts');
reset role;
update public.profiles set show_in_directory = false where id = 'ffffffff-5555-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.connection_state('ffffffff-5555-0000-0000-000000000003'), 'connected', 'A stays connected to C');
select is((select profile_visible from public.my_connection_lists() where member_id = 'ffffffff-5555-0000-0000-000000000003'), false, 'but C''s profile is not linkable');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-5555-0000-0000-000000000007","role":"authenticated"}', true);
select throws_ok($$select public.send_connection_request('ffffffff-5555-0000-0000-000000000003', '')$$, 'P0002', null, 'a new request to C is refused');

-- ===== deleting an account deletes its relations
reset role;
insert into public.connections (requester_id, addressee_id, status) values ('ffffffff-5555-0000-0000-000000000007', 'ffffffff-5555-0000-0000-000000000006', 'accepted');
delete from auth.users where id = 'ffffffff-5555-0000-0000-000000000006';
select is((select count(*) from public.connections where 'ffffffff-5555-0000-0000-000000000006' in (requester_id, addressee_id)), 0::bigint, 'deleting a member deletes their relations');

-- ===== production-like grants
select is(has_function_privilege('anon', 'public.send_connection_request(uuid, text)', 'execute'), false, 'anon has no execute');
select is(has_function_privilege('service_role', 'public.send_connection_request(uuid, text)', 'execute'), false, 'service_role has no execute');
select is(has_function_privilege('authenticated', 'public.send_connection_request(uuid, text)', 'execute'), true, 'authenticated has execute');
select is(has_function_privilege('authenticated', 'public.are_connected(uuid, uuid)', 'execute'), false, 'members cannot call the internal helper');

select * from finish();
rollback;
