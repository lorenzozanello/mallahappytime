-- Curriculum corpus: institutional, versioned, read-only for app users.
-- Content is loaded exclusively by the reproducible importer (supabase/seed.sql or
-- service-role sync); app users never write curriculum.

create extension if not exists vector with schema extensions;
create extension if not exists unaccent with schema extensions;

create table public.curriculum_versions (
  id text primary key,
  label text not null,
  effective_date date not null,
  source_file text not null,
  source_sha256 text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  imported_at timestamptz not null default now()
);

create unique index curriculum_versions_single_active on public.curriculum_versions ((status)) where status = 'active';

create table public.curriculum_levels (
  version_id text not null references public.curriculum_versions (id) on delete cascade,
  id text not null,
  code text not null,
  name text not null,
  sort_order smallint not null,
  cycle text not null,
  equivalence text not null,
  entry_age text not null,
  exit_age text not null,
  entry_profile text not null,
  exit_profile text not null,
  source_row integer not null,
  primary key (version_id, id)
);

create table public.curriculum_experiences (
  version_id text not null references public.curriculum_versions (id) on delete cascade,
  id text not null,
  level_id text not null,
  period smallint not null check (period between 1 and 4),
  period_label text not null,
  period_code text not null,
  title text not null,
  fields jsonb not null,
  purposes jsonb not null,
  activities jsonb not null,
  source_row integer not null,
  primary key (version_id, id),
  foreign key (version_id, level_id) references public.curriculum_levels (version_id, id)
);

create table public.curriculum_development_summaries (
  version_id text not null references public.curriculum_versions (id) on delete cascade,
  id text not null,
  level_id text not null,
  dimension text not null,
  content text not null,
  source_reference jsonb not null,
  primary key (version_id, id),
  foreign key (version_id, level_id) references public.curriculum_levels (version_id, id)
);

create table public.curriculum_principles (
  version_id text not null references public.curriculum_versions (id) on delete cascade,
  id text not null,
  sort_order smallint not null,
  content text not null,
  source_reference jsonb not null,
  primary key (version_id, id)
);

create table public.curriculum_chunks (
  curriculum_version text not null references public.curriculum_versions (id) on delete cascade,
  id text not null,
  level_id text,
  period smallint check (period between 1 and 4),
  experience_id text,
  section text not null,
  subsection text,
  content text not null,
  tags text[] not null default '{}',
  authority text not null default 'institutional' check (authority in ('institutional')),
  source_reference jsonb not null,
  content_hash text not null,
  status text not null default 'active' check (status in ('active', 'retired')),
  updated_at date not null,
  fts tsvector,
  embedding extensions.vector(1536),
  embedding_model text,
  primary key (curriculum_version, id)
);

create index curriculum_chunks_filters on public.curriculum_chunks (curriculum_version, level_id, period, section) where status = 'active';
create index curriculum_chunks_fts on public.curriculum_chunks using gin (fts);
create index curriculum_chunks_embedding on public.curriculum_chunks using hnsw (embedding extensions.vector_cosine_ops);

-- Full-text vector (Spanish, accent-insensitive). unaccent() is not immutable, so a
-- trigger maintains the column instead of a generated column.
create or replace function public.curriculum_chunks_set_fts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.fts :=
    setweight(to_tsvector('spanish', extensions.unaccent(coalesce(new.content, ''))), 'A') ||
    setweight(to_tsvector('spanish', extensions.unaccent(array_to_string(new.tags, ' '))), 'B');
  return new;
end;
$$;

create trigger curriculum_chunks_fts_trigger
before insert or update of content, tags on public.curriculum_chunks
for each row execute function public.curriculum_chunks_set_fts();

-- Hybrid search leg executed in the database: Spanish full-text rank + vector similarity,
-- both constrained by curriculum metadata. The application fuses these scores with its
-- in-process lexical ranking (see docs/ARCHITECTURE.md).
create or replace function public.match_curriculum_chunks(
  query_text text,
  query_embedding extensions.vector(1536) default null,
  filter_level text default null,
  filter_period smallint default null,
  filter_experience text default null,
  match_count integer default 20
)
returns table (id text, fts_rank real, similarity real)
language sql
stable
security invoker
set search_path = ''
as $$
  with active_version as (
    select v.id from public.curriculum_versions v where v.status = 'active' limit 1
  ),
  candidates as (
    select c.id, c.fts, c.embedding
    from public.curriculum_chunks c
    join active_version av on av.id = c.curriculum_version
    where c.status = 'active'
      and (filter_level is null or c.level_id = filter_level or c.level_id is null)
      and (filter_period is null or c.period = filter_period or c.period is null)
      and (filter_experience is null or c.experience_id = filter_experience)
  ),
  q as (
    select websearch_to_tsquery('spanish', extensions.unaccent(coalesce(query_text, ''))) as tsq
  ),
  lexical as (
    select c.id, ts_rank_cd(c.fts, q.tsq)::real as fts_rank
    from candidates c, q
    where c.fts @@ q.tsq
    order by fts_rank desc
    limit match_count
  ),
  semantic as (
    select c.id, (1 - (c.embedding operator(extensions.<=>) query_embedding))::real as similarity
    from candidates c
    where query_embedding is not null and c.embedding is not null
    order by c.embedding operator(extensions.<=>) query_embedding
    limit match_count
  )
  select coalesce(l.id, s.id) as id, coalesce(l.fts_rank, 0)::real, coalesce(s.similarity, 0)::real
  from lexical l
  full outer join semantic s on s.id = l.id;
$$;

-- RLS: curriculum is readable by signed-in users; only the service role (which bypasses
-- RLS) can write it.
alter table public.curriculum_versions enable row level security;
alter table public.curriculum_levels enable row level security;
alter table public.curriculum_experiences enable row level security;
alter table public.curriculum_development_summaries enable row level security;
alter table public.curriculum_principles enable row level security;
alter table public.curriculum_chunks enable row level security;

create policy "curriculum readable by authenticated" on public.curriculum_versions for select to authenticated using (true);
create policy "curriculum readable by authenticated" on public.curriculum_levels for select to authenticated using (true);
create policy "curriculum readable by authenticated" on public.curriculum_experiences for select to authenticated using (true);
create policy "curriculum readable by authenticated" on public.curriculum_development_summaries for select to authenticated using (true);
create policy "curriculum readable by authenticated" on public.curriculum_principles for select to authenticated using (true);
create policy "curriculum readable by authenticated" on public.curriculum_chunks for select to authenticated using (true);

revoke insert, update, delete on public.curriculum_versions, public.curriculum_levels, public.curriculum_experiences,
  public.curriculum_development_summaries, public.curriculum_principles, public.curriculum_chunks from anon, authenticated;
revoke execute on function public.match_curriculum_chunks from public, anon;
grant execute on function public.match_curriculum_chunks to authenticated, service_role;
