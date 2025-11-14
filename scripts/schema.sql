create extension if not exists vector;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  title text,
  bucket text not null,
  file_key text not null,
  folder text not null default 'shared',
  is_private boolean default false,
  created_at timestamptz default now()
);

create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists chunk_embeddings (
  chunk_id uuid primary key references chunks(id) on delete cascade,
  embedding vector(1536) not null,
  created_at timestamptz default now()
);

create index if not exists chunk_embeddings_hnsw on chunk_embeddings using hnsw (embedding vector_cosine_ops);
create index if not exists idx_documents_folder on documents(folder);
create index if not exists idx_documents_agent_folder on documents(agent_id, folder);

create or replace function match_chunks(
  query_embedding vector(1536),
  match_count int,
  agent_id text,
  folders text[] default array['shared']
)
returns table (
  chunk_id uuid,
  content text,
  chunk_index int,
  score float,
  document_id uuid,
  title text,
  bucket text,
  file_key text,
  folder text
)
language sql stable parallel safe as $$
  with scoped_docs as (
    select id, title, bucket, file_key, folder 
    from documents 
    where agent_id = match_chunks.agent_id
      and (folder = any(match_chunks.folders) or 'shared' = any(match_chunks.folders))
  ), scoped_chunks as (
    select c.id, c.document_id, c.content, c.chunk_index
    from chunks c
    join scoped_docs d on d.id = c.document_id
  )
  select
    e.chunk_id as chunk_id,
    sc.content as content,
    sc.chunk_index as chunk_index,
    (1 - (e.embedding <=> match_chunks.query_embedding)) as score,
    sc.document_id as document_id,
    d.title as title,
    d.bucket as bucket,
    d.file_key as file_key,
    d.folder as folder
  from chunk_embeddings e
  join scoped_chunks sc on sc.id = e.chunk_id
  join scoped_docs d on d.id = sc.document_id
  order by e.embedding <=> match_chunks.query_embedding asc
  limit match_chunks.match_count
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'chunk_embeddings' and column_name = 'embedding'
  ) then
    begin
      alter table chunk_embeddings alter column embedding type vector using embedding::vector;
    exception when others then
      null;
    end;
  end if;
end$$;

create or replace function insert_chunk_embeddings(
  chunk_ids uuid[],
  embeds_text text[]
)
returns void
language plpgsql as $$
declare
  i int;
begin
  for i in 1..coalesce(array_length(chunk_ids,1),0) loop
    insert into chunk_embeddings(chunk_id, embedding) values (chunk_ids[i], embeds_text[i]::vector(1536));
  end loop;
end;
$$;