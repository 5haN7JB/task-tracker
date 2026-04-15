-- ============================================================
-- Task Tracker — Supabase Schema
-- Run this entire file in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/bwjvhvpikszfpvmtbucu/sql
-- ============================================================

-- ── 1. PROFILES ──────────────────────────────────────────────
-- One row per auth user. Auto-created by trigger below.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  name        text not null,
  role        text not null default 'employee'
                check (role in ('manager', 'employee')),
  created_at  timestamptz not null default now()
);

-- ── 2. TASKS ─────────────────────────────────────────────────
create table if not exists public.tasks (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  description        text,
  status             text not null default 'todo'
                       check (status in ('todo', 'in_progress', 'done')),
  deadline           date,
  completion_percent integer not null default 0,
  feedback           text,
  created_by_id      uuid not null references public.profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── 3. TASK ASSIGNEES (junction) ─────────────────────────────
create table if not exists public.task_assignees (
  task_id  uuid references public.tasks(id) on delete cascade,
  user_id  uuid references public.profiles(id) on delete cascade,
  primary key (task_id, user_id)
);

-- ── 4. EMPLOYEE PROGRESS ─────────────────────────────────────
create table if not exists public.task_employee_progress (
  task_id                  uuid references public.tasks(id) on delete cascade,
  user_id                  uuid references public.profiles(id) on delete cascade,
  completion_percent       integer not null default 0,
  expected_completion_date date,
  updated_at               timestamptz,
  primary key (task_id, user_id)
);

-- ── 5. AUTO-CREATE PROFILE ON SIGN-UP ────────────────────────
-- Triggered whenever a new user is created in auth.users.
-- Works for both email/password sign-up AND Google OAuth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 6. ROW LEVEL SECURITY ────────────────────────────────────
alter table public.profiles              enable row level security;
alter table public.tasks                 enable row level security;
alter table public.task_assignees        enable row level security;
alter table public.task_employee_progress enable row level security;

-- Helper: get current user's role (used in RLS policies)
create or replace function public.my_role()
returns text
language sql stable security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- profiles: all authenticated users can read; own row only for updates
drop policy if exists "profiles: authenticated read" on public.profiles;
create policy "profiles: authenticated read"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- tasks: managers see all; employees see only assigned tasks
drop policy if exists "tasks: select" on public.tasks;
create policy "tasks: select"
  on public.tasks for select
  to authenticated
  using (
    public.my_role() = 'manager'
    or id in (
      select task_id from public.task_assignees where user_id = auth.uid()
    )
  );

drop policy if exists "tasks: manager insert" on public.tasks;
create policy "tasks: manager insert"
  on public.tasks for insert
  to authenticated
  with check (public.my_role() = 'manager');

drop policy if exists "tasks: manager or assignee update" on public.tasks;
create policy "tasks: manager or assignee update"
  on public.tasks for update
  to authenticated
  using (
    public.my_role() = 'manager'
    or id in (
      select task_id from public.task_assignees where user_id = auth.uid()
    )
  );

drop policy if exists "tasks: manager delete" on public.tasks;
create policy "tasks: manager delete"
  on public.tasks for delete
  to authenticated
  using (public.my_role() = 'manager');

-- task_assignees: authenticated read; managers manage
drop policy if exists "task_assignees: authenticated read" on public.task_assignees;
create policy "task_assignees: authenticated read"
  on public.task_assignees for select
  to authenticated
  using (true);

drop policy if exists "task_assignees: manager insert" on public.task_assignees;
create policy "task_assignees: manager insert"
  on public.task_assignees for insert
  to authenticated
  with check (public.my_role() = 'manager');

drop policy if exists "task_assignees: manager delete" on public.task_assignees;
create policy "task_assignees: manager delete"
  on public.task_assignees for delete
  to authenticated
  using (public.my_role() = 'manager');

-- task_employee_progress: authenticated read; own rows for upsert
drop policy if exists "progress: authenticated read" on public.task_employee_progress;
create policy "progress: authenticated read"
  on public.task_employee_progress for select
  to authenticated
  using (true);

drop policy if exists "progress: own upsert" on public.task_employee_progress;
create policy "progress: own upsert"
  on public.task_employee_progress for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "progress: own update" on public.task_employee_progress;
create policy "progress: own update"
  on public.task_employee_progress for update
  to authenticated
  using (user_id = auth.uid());

-- ── 7. DEMO USERS ─────────────────────────────────────────────
-- After running this SQL, create demo accounts in:
--   Supabase Dashboard > Authentication > Users > Add User
--
-- Create these two users with password: password123
--   manager@example.com  (then update their profile role to 'manager')
--   alice@example.com    (employee role — default)
--
-- To make manager@example.com a manager, run:
--   update public.profiles set role = 'manager'
--   where email = 'manager@example.com';
