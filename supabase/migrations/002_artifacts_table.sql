-- Artifacts table (for saved visual artifacts)
create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_name text not null,
  skill_description text,
  artifact_type text not null,
  audience text not null check (audience in ('student', 'teacher', 'curriculum')),
  tool_id text not null,
  image_data text not null,  -- base64 encoded image
  text_content text,
  model_used text,
  created_at timestamptz default now()
);

-- Indexes for performance
create index idx_artifacts_notebook_id on public.artifacts(notebook_id);
create index idx_artifacts_user_id on public.artifacts(user_id);
create index idx_artifacts_audience on public.artifacts(audience);

-- Row Level Security
alter table public.artifacts enable row level security;

-- RLS Policy (users only access their own artifacts)
create policy "Users CRUD own artifacts" on public.artifacts
  for all using (auth.uid() = user_id);
