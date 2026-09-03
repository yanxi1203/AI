create table if not exists public.app_states (
  device_id text primary key,
  state jsonb not null default '{}'::jsonb,
  schema_version integer not null default 2,
  updated_at timestamptz not null default now(),
  constraint app_states_valid_device_id
    check (device_id ~ '^[A-Za-z0-9_-]{8,80}$')
);

alter table public.app_states enable row level security;

-- FinMate 目前只允許自己的 Node.js 後端以 Secret Key 存取。
-- 尚未加入 Supabase Auth 前，不把財務資料開放給瀏覽器角色。
revoke all on table public.app_states from anon, authenticated;
