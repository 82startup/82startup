-- The owner is the first admin. Does nothing if the account does not exist yet.
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id and u.email = 'klee@sazze.vc';
