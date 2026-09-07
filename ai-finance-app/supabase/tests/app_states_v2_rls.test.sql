begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

select has_table('public', 'app_states_v2', 'app_states_v2 exists');
select col_is_pk('public', 'app_states_v2', 'user_id', 'user_id is the primary key');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, '', now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, '', now(), now())
on conflict (id) do nothing;

insert into public.app_states_v2 (user_id, state, revision)
values
  ('11111111-1111-4111-8111-111111111111', '{"owner":"A"}', 1),
  ('22222222-2222-4222-8222-222222222222', '{"owner":"B"}', 1)
on conflict (user_id) do update
set state = excluded.state,
    revision = excluded.revision;

select is(
  (select state->>'owner' from public.app_states_v2 where user_id = '22222222-2222-4222-8222-222222222222'),
  'B',
  'privileged setup confirms user B row exists before RLS checks'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(
  (select state->>'owner' from public.app_states_v2 where user_id = '11111111-1111-4111-8111-111111111111'),
  'A',
  'user A reads own state'
);
select is(
  (with changed as (
    update public.app_states_v2
    set state = '{"owner":"A-updated"}'
    where user_id = '11111111-1111-4111-8111-111111111111'
    returning 1
  ) select count(*)::integer from changed),
  1,
  'user A updates own state'
);
select is(
  (select state->>'owner' from public.app_states_v2 where user_id = '11111111-1111-4111-8111-111111111111'),
  'A-updated',
  'user A sees the updated own state'
);
select is(
  (select count(*)::integer from public.app_states_v2 where user_id = '22222222-2222-4222-8222-222222222222'),
  0,
  'user A cannot read user B'
);
select throws_ok(
  $$insert into public.app_states_v2 (user_id, state) values ('22222222-2222-4222-8222-222222222222', '{}')$$,
  '42501',
  null,
  'user A cannot insert as user B'
);
select is(
  (with changed as (
    update public.app_states_v2 set state = '{"owner":"spoof"}'
    where user_id = '22222222-2222-4222-8222-222222222222'
    returning 1
  ) select count(*)::integer from changed),
  0,
  'user A cannot update the existing user B row'
);
select is(
  (with removed as (
    delete from public.app_states_v2
    where user_id = '22222222-2222-4222-8222-222222222222'
    returning 1
  ) select count(*)::integer from removed),
  0,
  'user A cannot delete the existing user B row'
);

reset role;
select is(
  (select state->>'owner' from public.app_states_v2 where user_id = '22222222-2222-4222-8222-222222222222'),
  'B',
  'privileged verification confirms user B row still exists and is unchanged'
);

set local role anon;
select throws_ok(
  $$insert into public.app_states_v2 (user_id, state) values ('11111111-1111-4111-8111-111111111111', '{}')$$,
  '42501',
  null,
  'anon role has no direct CRUD grant'
);

select * from finish();
rollback;
