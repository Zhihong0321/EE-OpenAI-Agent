# Database Migration Guide

## Choose Your Path

### Path A: Fresh Installation (No Existing Tables)
Use this if you're setting up Supabase for the first time.

**File:** `scripts/schema-fresh-install.sql`

**Steps:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy entire contents of `scripts/schema-fresh-install.sql`
3. Paste and run
4. Done! ✅

---

### Path B: Migration (Keep Existing Data)
Use this if you already have `documents`, `chunks`, `chunk_embeddings` tables **and want to keep your data**.

**File:** `scripts/migration-add-folders.sql`

**Steps:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy entire contents of `scripts/migration-add-folders.sql`
3. Paste and run
4. Verify with queries at bottom of file
5. Done! ✅

---

### Path C: Drop and Recreate (⚠️ Deletes All Data)
Use this if you have existing tables but **don't need to keep the data**.

**File:** `scripts/drop-and-recreate.sql`

**⚠️ WARNING:** This will delete all documents, chunks, and embeddings!

**Steps:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy entire contents of `scripts/drop-and-recreate.sql`
3. Read the warning at the top
4. Paste and run
5. All data will be deleted and schema recreated with folder support
6. Done! ✅

---

## What Gets Added

### New Columns
```sql
documents.folder          -- text, default 'shared'
documents.is_private      -- boolean, default false
```

### New Indexes
```sql
idx_documents_folder           -- Fast folder filtering
idx_documents_agent_folder     -- Fast agent+folder queries
```

### Updated Function
```sql
match_chunks(
  query_embedding vector(1536),
  match_count int,
  agent_id text,
  folders text[] DEFAULT array['shared']  -- NEW PARAMETER
)
```

---

## Verification

After running the migration, verify it worked:

### Check Columns
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'documents' 
  AND column_name IN ('folder', 'is_private');
```

**Expected Result:**
```
column_name  | data_type | column_default
-------------|-----------|---------------
folder       | text      | 'shared'
is_private   | boolean   | false
```

### Check Indexes
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'documents' 
  AND indexname LIKE '%folder%';
```

**Expected Result:**
```
indexname
---------------------------------
idx_documents_folder
idx_documents_agent_folder
```

### Check Function
```sql
SELECT routine_name, 
       array_agg(parameter_name ORDER BY ordinal_position) as parameters
FROM information_schema.parameters
WHERE specific_name IN (
  SELECT specific_name 
  FROM information_schema.routines 
  WHERE routine_name = 'match_chunks'
)
GROUP BY routine_name;
```

**Expected Result:**
Should include `folders` parameter.

### Check Data
```sql
-- All existing documents should be in 'shared' folder
SELECT folder, COUNT(*) 
FROM documents 
GROUP BY folder;
```

**Expected Result:**
```
folder  | count
--------|------
shared  | X
```

---

## Troubleshooting

### Error: "column folder already exists"
**Solution:** You already ran the migration. Skip to verification.

### Error: "function match_chunks already exists"
**Solution:** The migration uses `CREATE OR REPLACE`, so this shouldn't happen. If it does, drop the function first:
```sql
DROP FUNCTION IF EXISTS match_chunks(vector, int, text);
```
Then re-run the migration.

### Error: "relation documents does not exist"
**Solution:** Use Path A (Fresh Installation) instead.

### Existing documents not showing in searches
**Solution:** Make sure they're tagged with 'shared' folder:
```sql
UPDATE documents 
SET folder = 'shared' 
WHERE folder IS NULL OR folder = '';
```

---

## Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
-- Remove folder columns
ALTER TABLE documents DROP COLUMN IF EXISTS folder;
ALTER TABLE documents DROP COLUMN IF EXISTS is_private;

-- Remove indexes
DROP INDEX IF EXISTS idx_documents_folder;
DROP INDEX IF EXISTS idx_documents_agent_folder;

-- Restore old function (without folders parameter)
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_count int,
  agent_id text
)
RETURNS TABLE (
  chunk_id uuid,
  content text,
  chunk_index int,
  score float,
  document_id uuid,
  title text,
  bucket text,
  file_key text
)
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  WITH scoped_docs AS (
    SELECT id, title, bucket, file_key 
    FROM documents 
    WHERE agent_id = match_chunks.agent_id
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
    d.file_key AS file_key
  FROM chunk_embeddings e
  JOIN scoped_chunks sc ON sc.id = e.chunk_id
  JOIN scoped_docs d ON d.id = sc.document_id
  ORDER BY e.embedding <=> match_chunks.query_embedding ASC
  LIMIT match_chunks.match_count
$$;
```

---

## Post-Migration Steps

After successful migration:

1. **Update Agent Configs**
   ```javascript
   PATCH /manager/agents/your-agent
   {
     "config": {
       "folders": ["shared", "your-team"]
     }
   }
   ```

2. **Organize Files**
   - Create folder structure in Supabase Storage
   - Move files to appropriate folders
   - Re-index with folder tags

3. **Test Search**
   ```javascript
   POST /manager/search
   {
     "agent_id": "your-agent",
     "query": "test",
     "folders": ["shared"]
   }
   ```

4. **Update Documentation**
   - Inform frontend team about new folder parameters
   - Update API examples

---

## Quick Reference

### For Existing Projects
```bash
# Copy this file
scripts/migration-add-folders.sql

# Run in Supabase SQL Editor
# Verify with queries at bottom
```

### For New Projects
```bash
# Copy this file
scripts/schema-fresh-install.sql

# Run in Supabase SQL Editor
# Start using immediately
```

---

## Support

If you encounter issues:
1. Check the error message carefully
2. Verify which path (A or B) you should use
3. Run verification queries
4. Check FOLDER-SUPPORT.md for usage examples
