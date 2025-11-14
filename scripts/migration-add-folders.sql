-- Migration: Add folder support to existing schema
-- Run this if you already have documents/chunks/chunk_embeddings tables

-- Step 1: Add folder column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS folder text NOT NULL DEFAULT 'shared';

-- Step 2: Add is_private column
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

-- Step 3: Create indexes for folder filtering
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder);
CREATE INDEX IF NOT EXISTS idx_documents_agent_folder ON documents(agent_id, folder);

-- Step 4: Update existing documents to use 'shared' folder
UPDATE documents 
SET folder = 'shared' 
WHERE folder IS NULL OR folder = '';

-- Step 5: Update match_chunks function to support folders
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

-- Verification queries
-- Run these to check the migration worked:

-- Check folder column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'documents' AND column_name IN ('folder', 'is_private');

-- Check indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'documents' AND indexname LIKE '%folder%';

-- Check function signature
SELECT routine_name, data_type 
FROM information_schema.routines 
WHERE routine_name = 'match_chunks';

-- Count documents by folder
SELECT folder, COUNT(*) 
FROM documents 
GROUP BY folder;
