-- Enable extensions
create extension if not exists vector with schema extensions;

-- Profiles (extends Supabase Auth)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz default now()
);

-- Notebooks
create table public.notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text default '#3b82f6',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sources (documents)
create type source_type as enum ('url', 'pdf', 'txt');
create type source_status as enum ('pending', 'processing', 'success', 'error');

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type source_type not null,
  url text,
  title text,
  filename text,
  status source_status default 'pending',
  raw_text text,
  error_message text,
  created_at timestamptz default now()
);

-- Chunks (for RAG) - Using halfvec for Gemini's 3072-dimension embeddings
create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  content text not null,
  chunk_index integer not null,
  embedding extensions.halfvec(3072),
  token_count integer,
  created_at timestamptz default now()
);

-- HNSW index for vector search (using halfvec_cosine_ops for halfvec type)
create index idx_chunks_embedding on public.chunks
  using hnsw (embedding extensions.halfvec_cosine_ops);

-- Messages (chat history)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  context_chunk_ids uuid[],
  created_at timestamptz default now()
);

-- Additional indexes for performance
create index idx_notebooks_user_id on public.notebooks(user_id);
create index idx_sources_notebook_id on public.sources(notebook_id);
create index idx_sources_user_id on public.sources(user_id);
create index idx_chunks_notebook_id on public.chunks(notebook_id);
create index idx_chunks_source_id on public.chunks(source_id);
create index idx_messages_notebook_id on public.messages(notebook_id);
create index idx_messages_user_id on public.messages(user_id);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.notebooks enable row level security;
alter table public.sources enable row level security;
alter table public.chunks enable row level security;
alter table public.messages enable row level security;

-- RLS Policies (users only access their own data)
create policy "Users CRUD own profile" on public.profiles
  for all using (auth.uid() = id);

create policy "Users CRUD own notebooks" on public.notebooks
  for all using (auth.uid() = user_id);

create policy "Users CRUD own sources" on public.sources
  for all using (auth.uid() = user_id);

create policy "Users access own chunks" on public.chunks
  for all using (
    notebook_id in (select id from public.notebooks where user_id = auth.uid())
  );

create policy "Users CRUD own messages" on public.messages
  for all using (auth.uid() = user_id);

-- Vector search function (notebook-isolated)
-- Uses halfvec and cosine distance for similarity
create or replace function public.match_chunks(
  query_embedding extensions.halfvec(3072),
  p_notebook_id uuid,
  match_count int default 10,
  similarity_threshold float default 0.5
)
returns table (
  id uuid,
  source_id uuid,
  content text,
  chunk_index int,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.source_id,
    c.content,
    c.chunk_index,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.chunks c
  where c.notebook_id = p_notebook_id
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Function to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for notebooks updated_at
create trigger notebooks_updated_at
  before update on public.notebooks
  for each row execute procedure public.update_updated_at();
