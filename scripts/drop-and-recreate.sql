-- ⚠️  WARNING: This will DELETE ALL existing data!
-- Only use this if you want to start fresh with folder support
-- If you want to keep existing data, use migration-add-folders.sql instead

-- Step 1: Drop existing tables (cascades to dependent objects)
DROP TABLE IF EXISTS chunk_embeddings CASCADE;
DROP TABLE IF EXISTS chunks CASCADE;
DROP TABLE IF EXISTS documents CASCADE;

-- Step 2: Drop existing functions
DROP FUNCTION IF EXISTS match_chunks(vector, int, text, text[]);
DROP FUNCTION IF EXISTS match_chunks(vector, int, text);
DROP FUNCTION IF EXISTS insert_chunk_embeddings(uuid[], text[]);

-- Step 3: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 4: Create documents table with folder support
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  title text,
  bucket text NOT NULL,
  file_key text NOT NULL,
  folder text NOT NULL DEFAULT 'shared',
  is_private boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Step 5: Create chunks table
CREATE TABLE chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Step 6: Create chunk_embeddings table
CREATE TABLE chunk_embeddings (
  chunk_id uuid PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Step 7: Create indexes
CREATE INDEX chunk_embeddings_hnsw ON chunk_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_documents_folder ON documents(folder);
CREATE INDEX idx_documents_agent_folder ON documents(agent_id, folder);

-- Step 8: Create search function with folder support
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_count int,
  agent_id text,
  folders text[] DEFAULT array['shared']
)
RETURNS TABLE (
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
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  WITH scoped_docs AS (
    SELECT id, title, bucket, file_key, folder 
    FROM documents 
    WHERE agent_id = match_chunks.agent_id
      AND (folder = ANY(match_chunks.folders) OR 'shared' = ANY(match_chunks.folders))
  ), scoped_chunks AS (
    SELECT c.id, c.document_id, c.content, c.chunk_index
    FROM chunks c
    JOIN scoped_docs d ON d.id = c.document_id
  )
  SELECT
    e.chunk_id AS chunk_id,
    sc.content AS content,
    sc.chunk_index AS chunk_index,
    (1 - (e.embedding <=> match_chunks.query_embedding)) AS score,
    sc.document_id AS document_id,
    d.title AS title,
    d.bucket AS bucket,
    d.file_key AS file_key,
    d.folder AS folder
  FROM chunk_embeddings e
  JOIN scoped_chunks sc ON sc.id = e.chunk_id
  JOIN scoped_docs d ON d.id = sc.document_id
  ORDER BY e.embedding <=> match_chunks.query_embedding ASC
  LIMIT match_chunks.match_count
$$;

-- Step 9: Create helper function to insert embeddings
CREATE OR REPLACE FUNCTION insert_chunk_embeddings(
  chunk_ids uuid[],
  embeds_text text[]
)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  i int;
BEGIN
  FOR i IN 1..COALESCE(array_length(chunk_ids, 1), 0) LOOP
    INSERT INTO chunk_embeddings(chunk_id, embedding) 
    VALUES (chunk_ids[i], embeds_text[i]::vector(1536));
  END LOOP;
END;
$$;

-- Verification
SELECT 'Schema recreated successfully with folder support!' AS status;

-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('documents', 'chunks', 'chunk_embeddings')
ORDER BY table_name;

-- Check folder column
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'documents' 
  AND column_name IN ('folder', 'is_private');
