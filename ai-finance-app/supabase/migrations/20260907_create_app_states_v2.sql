begin;

create table if not exists public.app_states_v2 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  schema_version integer not null default 2 check (schema_version > 0),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);

alter table public.app_states_v2 enable row level security;

revoke all on table public.app_states_v2 from anon;
grant select, insert, update, delete on table public.app_states_v2 to authenticated;

drop policy if exists "app_states_v2_select_own" on public.app_states_v2;
create policy "app_states_v2_select_own"
on public.app_states_v2 for select
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "app_states_v2_insert_own" on public.app_states_v2;
create policy "app_states_v2_insert_own"
on public.app_states_v2 for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "app_states_v2_update_own" on public.app_states_v2;
create policy "app_states_v2_update_own"
on public.app_states_v2 for update
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "app_states_v2_delete_own" on public.app_states_v2;
create policy "app_states_v2_delete_own"
on public.app_states_v2 for delete
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

commit;
