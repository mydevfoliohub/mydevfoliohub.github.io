-- Deviloq Resume Studio tailored content.
-- Run after sql/resume_settings_migration.sql and sql/portfolio_privacy_migration.sql.
-- Keeps resume-only summaries and experience out of the public profiles row.

create table if not exists public.resume_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_role text not null default '',
  summary text not null default '',
  priority_skills text[] not null default '{}'::text[],
  experience jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resume_documents_target_role_length check (char_length(target_role) <= 120),
  constraint resume_documents_summary_length check (char_length(summary) <= 1200),
  constraint resume_documents_priority_skills_limit check (cardinality(priority_skills) <= 40),
  constraint resume_documents_experience_array check (jsonb_typeof(experience) = 'array'),
  constraint resume_documents_payload_limit check (octet_length(experience::text) <= 12000)
);

comment on table public.resume_documents is
  'Owner-authored Resume Studio content. Public reads are allowed only when both the portfolio and saved resume are public.';

alter table public.resume_documents enable row level security;

drop policy if exists "resume documents owner read" on public.resume_documents;
create policy "resume documents owner read"
on public.resume_documents for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "resume documents public read" on public.resume_documents;
create policy "resume documents public read"
on public.resume_documents for select
to anon, authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = resume_documents.user_id
      and p.is_public is true
      and p.resume_settings ->> 'public' = 'true'
  )
);

drop policy if exists "resume documents owner insert" on public.resume_documents;
create policy "resume documents owner insert"
on public.resume_documents for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "resume documents owner update" on public.resume_documents;
create policy "resume documents owner update"
on public.resume_documents for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "resume documents owner delete" on public.resume_documents;
create policy "resume documents owner delete"
on public.resume_documents for delete
to authenticated
using (auth.uid() = user_id);

revoke all on table public.resume_documents from public;
grant select on table public.resume_documents to anon;
grant select, insert, update, delete on table public.resume_documents to authenticated;
