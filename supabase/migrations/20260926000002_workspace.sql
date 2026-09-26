-- Teacher workspace, roles and Happy observability.
-- Private workspace content is only ever visible to its owner.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role text not null default 'teacher' check (role in ('teacher', 'coordinator', 'admin')),
  active_level_id text check (active_level_id in ('step-1', 'step-2', 'step-3', 'kinder', 'transicion')),
  active_period smallint check (active_period between 1 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Role lookup that does not recurse through RLS.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.role from public.profiles p where p.id = auth.uid()), 'teacher');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles: admins read all" on public.profiles for select to authenticated using (public.current_app_role() = 'admin');
create policy "profiles: update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Teachers may edit their name and active level/period, never their role.
revoke update on public.profiles from authenticated;
grant update (display_name, active_level_id, active_period) on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

create or replace function public.set_user_role(target_user uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_app_role() <> 'admin' then
    raise exception 'Solo administración puede cambiar roles' using errcode = '42501';
  end if;
  if new_role not in ('teacher', 'coordinator', 'admin') then
    raise exception 'Rol no válido: %', new_role using errcode = '22023';
  end if;
  update public.profiles set role = new_role where id = target_user;
end;
$$;
revoke execute on function public.set_user_role from public, anon;
grant execute on function public.set_user_role to authenticated;

-- Saved items: favorites (curriculum experiences), Happy ideas, and future notes/records.
create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('favorite', 'happy_idea', 'note')),
  title text not null check (char_length(title) between 1 and 300),
  level_id text,
  period smallint check (period between 1 and 4),
  experience_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index saved_items_user on public.saved_items (user_id, kind, created_at desc);
create unique index saved_items_unique_favorite on public.saved_items (user_id, experience_id) where kind = 'favorite';
create trigger saved_items_touch before update on public.saved_items for each row execute function public.touch_updated_at();

-- Lightweight planning drafts (editable pedagogical artifact, not an admin form).
create table public.planning_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  level_id text,
  period smallint check (period between 1 and 4),
  experience_id text,
  content jsonb not null default '{}'::jsonb,
  source_saved_item_id uuid references public.saved_items (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index planning_drafts_user on public.planning_drafts (user_id, updated_at desc);
create trigger planning_drafts_touch before update on public.planning_drafts for each row execute function public.touch_updated_at();

alter table public.saved_items enable row level security;
alter table public.planning_drafts enable row level security;

create policy "saved_items: owner select" on public.saved_items for select to authenticated using (user_id = auth.uid());
create policy "saved_items: owner insert" on public.saved_items for insert to authenticated with check (user_id = auth.uid());
create policy "saved_items: owner update" on public.saved_items for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "saved_items: owner delete" on public.saved_items for delete to authenticated using (user_id = auth.uid());

create policy "planning: owner select" on public.planning_drafts for select to authenticated using (user_id = auth.uid());
create policy "planning: owner insert" on public.planning_drafts for insert to authenticated with check (user_id = auth.uid());
create policy "planning: owner update" on public.planning_drafts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "planning: owner delete" on public.planning_drafts for delete to authenticated using (user_id = auth.uid());

revoke all on public.saved_items, public.planning_drafts from anon;

-- Happy observability: metadata only. Teacher prompts and model outputs are NOT stored here.
create table public.happy_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  mode text not null,
  model text not null,
  prompt_version text not null,
  latency_ms integer,
  retrieval_count integer not null default 0,
  source_ids text[] not null default '{}',
  validation_status text not null,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(10, 6),
  error_code text,
  level_id text,
  period smallint
);
create index happy_events_created on public.happy_events (created_at desc);

create table public.happy_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.happy_events (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rating text not null check (rating in ('useful', 'not_useful')),
  next_action text,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.happy_events enable row level security;
alter table public.happy_feedback enable row level security;

create policy "happy_events: owner insert" on public.happy_events for insert to authenticated with check (user_id = auth.uid());
create policy "happy_events: owner select" on public.happy_events for select to authenticated using (user_id = auth.uid());
create policy "happy_events: admin select" on public.happy_events for select to authenticated using (public.current_app_role() = 'admin');
create policy "happy_feedback: owner insert" on public.happy_feedback for insert to authenticated with check (user_id = auth.uid());
create policy "happy_feedback: owner update" on public.happy_feedback for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "happy_feedback: owner select" on public.happy_feedback for select to authenticated using (user_id = auth.uid());
create policy "happy_feedback: admin select" on public.happy_feedback for select to authenticated using (public.current_app_role() = 'admin');

revoke update, delete on public.happy_events from authenticated;
revoke all on public.happy_events, public.happy_feedback from anon;
