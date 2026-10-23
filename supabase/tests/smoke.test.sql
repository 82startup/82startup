begin;
select plan(1);
select is(1 + 1, 2, 'database tests run');
select * from finish();
rollback;
