-- Prompt overrides table for custom artifact prompts
create table if not exists public.prompt_overrides (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  audience text not null check (audience in ('student', 'teacher', 'curriculum')),
  tool_id text not null,
  artifact_id text not null,
  custom_prompt text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Unique constraint: one override per artifact per notebook
  unique(notebook_id, audience, tool_id, artifact_id)
);

-- Enable RLS
alter table public.prompt_overrides enable row level security;

-- RLS Policy: users can only access their own prompt overrides
create policy "Users CRUD own prompt_overrides" on public.prompt_overrides
  for all using (auth.uid() = user_id);

-- Index for faster lookups
create index idx_prompt_overrides_lookup on public.prompt_overrides(notebook_id, audience, tool_id, artifact_id);

-- Update timestamp trigger
create or replace function update_prompt_overrides_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger prompt_overrides_updated_at
  before update on public.prompt_overrides
  for each row execute function update_prompt_overrides_updated_at();
