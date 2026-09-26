-- RLS and integrity assertions. Any failed assertion raises and aborts (ON_ERROR_STOP).
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'docente.a@happytime.test'),
  ('00000000-0000-0000-0000-00000000000b', 'docente.b@happytime.test'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@happytime.test');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

do $$ begin
  assert (select count(*) from public.profiles) = 3, 'profile trigger should create 3 profiles';
  assert (select count(*) from public.curriculum_experiences) = 20, 'expected 20 experiences';
  assert (select count(*) from public.curriculum_chunks where status = 'active') = (select count(*) from public.curriculum_chunks), 'all chunks active';
  assert (select count(*) from public.curriculum_chunks where fts is null) = 0, 'fts populated by trigger';
end $$;

-- Teacher A
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into public.saved_items (kind, title, experience_id) values ('favorite', 'Mis palabras cuentan lo que vivo', 'HT-S2-P3');
insert into public.planning_drafts (title, experience_id, content) values ('Plan A', 'HT-S2-P3', '{"intention":"x"}');
do $$ begin
  assert (select count(*) from public.saved_items) = 1, 'A sees own saved item';
  assert (select count(*) from public.curriculum_chunks) > 500, 'authenticated can read curriculum';
  assert (select count(*) from public.match_curriculum_chunks('cuentos literatura', null, 'step-2', 3::smallint, null, 10)) > 0, 'FTS search returns results';
end $$;
-- A cannot escalate own role
do $$ begin
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'role escalation should fail';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_user_role(auth.uid(), 'admin');
    raise exception 'set_user_role should fail for teacher';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.curriculum_chunks (curriculum_version, id, section, content, source_reference, content_hash, updated_at)
      values ('ht-malla-2026-06', 'X', 'dua', 'x', '{}', 'x', now());
    raise exception 'teacher must not write curriculum';
  exception when insufficient_privilege then null;
  end;
end $$;
update public.profiles set active_level_id = 'step-2', active_period = 3 where id = auth.uid();

-- Teacher B cannot see or modify A's workspace
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  assert (select count(*) from public.saved_items) = 0, 'B must not see A saved items';
  assert (select count(*) from public.planning_drafts) = 0, 'B must not see A drafts';
  assert (select count(*) from public.profiles) = 1, 'B sees only own profile';
end $$;
update public.planning_drafts set title = 'hacked';
delete from public.saved_items;
do $$ begin
  begin
    insert into public.saved_items (user_id, kind, title) values ('00000000-0000-0000-0000-00000000000a', 'note', 'spoof');
    raise exception 'insert for another user should fail';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Admin can read profiles and change roles
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ad', false);
do $$ begin
  assert (select count(*) from public.profiles) = 3, 'admin reads all profiles';
  assert (select count(*) from public.saved_items) = 0, 'admin cannot read private workspaces';
end $$;
select public.set_user_role('00000000-0000-0000-0000-00000000000b', 'coordinator');

-- Anonymous users see nothing
reset role;
set role anon;
do $$ begin
  begin
    perform count(*) from public.saved_items;
    raise exception 'anon must not read saved items';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.curriculum_chunks) = 0, 'anon reads no curriculum rows';
end $$;
reset role;
do $$ begin
  assert (select title from public.planning_drafts limit 1) = 'Plan A', 'B could not modify A draft';
  assert (select count(*) from public.saved_items) = 1, 'B could not delete A item';
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 'coordinator', 'admin changed role';
  assert (select active_period from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 3, 'teacher updated own period';
end $$;
select 'RLS assertions passed' as result;
