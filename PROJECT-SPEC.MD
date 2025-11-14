# Project Spec

## Overview
- Host agent wrappers as API services under `/x-app/<appId>`, managed by a central Manager.
- Route all OpenAI-format requests to a 3rd-party provider (`bltcy.ai`).
- Use Supabase for file CRUD (Storage) and vector search (pgvector).
- **NEW:** Folder-based access control for multi-tenant knowledge bases.
- **NEW:** Interactive API documentation via Swagger UI.
- Frontend is a separate project calling these APIs.

## Architecture
- Wrapper: Accepts OpenAI Agent Designer code, adapts routing and file search, exposes an OpenAI-compatible API.
- Manager: Manages wrapper lifecycle and handles file ingestion, indexing, and search via Supabase.
- Provider Routing: Enforces `baseURL=THIRD_PARTY_BASE_URL` and `Authorization: Bearer THIRD_PARTY_API_KEY` for all model/embedding calls.
- Vector Store: Supabase Postgres with `pgvector` for embeddings and similarity search; files stored in Supabase Storage.
- **Folder System:** Hierarchical folder structure (`shared/`, `team-name/`, `agent-id/`) with per-agent access control.
- **API Documentation:** Swagger UI at `/docs` with OpenAPI 3.0 specification for frontend integration.

## Directory Layout
- `wrappers/<appId>/` per-wrapper assets and config
- `manager/` management endpoints (agents, files, index, search)
- `middleware/` auth, OpenAI-shape normalization, error handling
- `services/` `provider.ts`, `supabase.ts`, `vectors.ts`
- `routes/` `x-app/*.ts`, `manager/*.ts`
- `scripts/` ops helpers (upload/index/list)
- `config/` runtime config and schema helpers

## Environment
- Provider: `THIRD_PARTY_BASE_URL`, `THIRD_PARTY_API_KEY`
- Supabase: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_BUCKET`
- Runtime: `PORT`, `NODE_ENV`, optional `AGENT_ID`, `AGENT_FOLDERS`
- Auth: `MANAGER_TOKEN` (optional, for Manager endpoint authentication)
- Secrets must be provided via environment; never hardcoded.

### Agent Configuration
- `AGENT_ID`: Unique identifier for the agent (default: 'default')
- `AGENT_FOLDERS`: Comma-separated list of accessible folders (default: 'shared')
  - Example: `AGENT_FOLDERS=shared,sales-team,support-team`
  - Use `*` for admin access to all folders

## APIs

### Documentation Endpoints
- `GET /` → Landing page with links to docs and health checks
- `GET /docs` → Interactive Swagger UI documentation
- `GET /openapi.yaml` → Download OpenAPI 3.0 specification
- `GET /health` → Health check
- `GET /diagnostics` → System diagnostics (Supabase, provider status)
- `GET /schema` → SQL schema for vector tables

### Wrapper
- `POST /x-app/:appId/deploy`
  - Input: agent source/bundle, config (models, tools, **folders**). Adapter rewrites provider calls and replaces file search tools.
  - Output: `{ appId, status, endpoints }`
- `POST /x-app/:appId/invoke`
  - Input: `messages`, `tools`, `tool_choice`, `stream`, `metadata` (**metadata.folders** for folder override)
  - Output: OpenAI-compatible response (`choices[0].message`, `id`, `model`, `usage`)
  - **NEW:** Automatically enforces agent's folder access from config
  - **NEW:** Context includes folder source: `# Context (from folder-name)`
- `GET /x-app/:appId`
  - Output: wrapper details, config, health, **folder access**
- `PATCH /x-app/:appId`
  - Input: update config (model, tools, routing, **folders**)
- `DELETE /x-app/:appId`
  - Output: `{ deleted: true }`

### Manager
- Agents
  - `POST /manager/agents` → create wrapper record with **config.folders** array
  - `GET /manager/agents` → list all agents
  - `GET /manager/agents/:id` → details including folder access
  - `PATCH /manager/agents/:id` → update config including **folders**
  - `DELETE /manager/agents/:id` → delete agent
  - **Agent Config Schema:**
    ```json
    {
      "id": "agent-id",
      "config": {
        "model": "gpt-4o",
        "folders": ["shared", "team-name"],
        "private_folder": "agent-id"
      }
    }
    ```
- Files (Supabase Storage)
  - `POST /manager/files/upload` → upload to `SUPABASE_BUCKET` with **folder** parameter
    - Auto-detects folder from `dest_path` (e.g., `sales-team/file.pdf` → folder: `sales-team`)
    - Falls back to `'shared'` if no folder specified
  - `GET /manager/files` → list by `agent_id`/prefix/**folder**
  - `DELETE /manager/files/:key` → remove file (does not cascade to vector data)
  - `GET /manager/files/url` → signed/public URL
- Indexing (pgvector)
  - `POST /manager/index` → chunk text, embed via provider, insert with **folder** tag
    - Input: `{ file_key, agent_id, folder, title, chunk_options, embedding_model }`
    - Folder auto-detected from `file_key` if not provided
  - **NEW:** Documents tagged with folder for access control
- Search
  - `POST /manager/search` → `{ agent_id, query, top_k, folders }` returns top‑k chunks with **folder** metadata
  - **NEW:** Filters results by `folders` array (default: `['shared']`)
  - **NEW:** Response includes `folder` field for each result

## Data Model
- `documents(id uuid pk, agent_id text, title text, bucket text, file_key text, **folder text default 'shared'**, **is_private boolean default false**, created_at timestamptz)`
- `chunks(id uuid pk, document_id uuid fk, chunk_index int, content text, created_at timestamptz)`
- `chunk_embeddings(chunk_id uuid pk fk, embedding vector(1536), created_at timestamptz)`
- Indexes:
  - `create index on chunk_embeddings using hnsw (embedding vector_cosine_ops)`
  - **`create index on documents(folder)`** - Fast folder filtering
  - **`create index on documents(agent_id, folder)`** - Composite index for agent+folder queries
- Dimension `1536` aligns with `text-embedding-3-small`.

### Folder Schema
- **folder** (text, not null, default 'shared'): Hierarchical folder path
  - Examples: `'shared'`, `'sales-team'`, `'support-team'`, `'agent-123'`
- **is_private** (boolean, default false): Flag for private agent folders

### RPC Function
- `match_chunks(query_embedding, match_count, agent_id, **folders text[] default array['shared']**)`
  - **NEW:** Accepts `folders` array parameter
  - Filters documents by folder access before similarity search
  - Returns `folder` field in results

## Workflows

### Deploy Wrapper
- Designer posts code → adapter rewrites provider calls to `bltcy.ai`, replaces file search with Manager tool → registered at `/x-app/<appId>`.
- **NEW:** Agent config includes `folders` array for access control.

### File Ingestion with Folders
1. Upload file to Supabase Storage with folder path (e.g., `sales-team/pricing.pdf`)
2. Register `documents` with **folder** tag (auto-detected or explicit)
3. Chunk text (1200 chars, 200 overlap)
4. Generate embeddings via provider
5. Insert `chunks` and `chunk_embeddings`
6. Document is now searchable only by agents with folder access

### Search with Folder Restrictions
1. Agent requests search with query
2. Manager checks agent's `config.folders` (or uses request `folders` parameter)
3. Generate query embedding via provider
4. SQL similarity search filtered by `agent_id` AND `folder IN (allowed_folders)`
5. Return top-k chunks with folder metadata
6. **NEW:** Results include which folder each chunk came from

### Invocation with Folder Context
1. Wrapper receives OpenAI-format `messages` with `file_search` tool
2. Wrapper checks agent's `config.folders` from Manager
3. Calls Manager search with folder restrictions
4. **NEW:** Context includes folder source: `# Context (from sales-team)`
5. Injects retrieved context into system prompt
6. Completes via `bltcy.ai` with enriched context

### Multi-Agent Isolation
- **Sales Agent** (`folders: ['shared', 'sales-team']`)
  - ✅ Can access: `shared/`, `sales-team/`
  - ❌ Cannot access: `support-team/`, `agent-123/`
- **Support Agent** (`folders: ['shared', 'support-team']`)
  - ✅ Can access: `shared/`, `support-team/`
  - ❌ Cannot access: `sales-team/`, `agent-123/`
- **Admin Agent** (`folders: ['*']`)
  - ✅ Can access: All folders

## Provider Routing
- All `chat.completions`, `responses`, `embeddings` routed to `THIRD_PARTY_BASE_URL` with `THIRD_PARTY_API_KEY`.
- Maintain OpenAI-compatible input/output shapes, streaming semantics, tool/function calls, and error objects.

## Supabase Integration
- Storage: Supabase Storage for raw files; access via signed/public URLs.
- Vector: pgvector tables and HNSW index; Manager owns inserts/queries.
- Optional automatic embeddings (future): triggers + `pgmq` + `pg_cron` + `pg_net` and Edge Function to generate embeddings asynchronously.

## Security
- Wrapper requests require auth; rate-limit per `appId` (60 req/min default).
- Manager endpoints protected by `MANAGER_TOKEN` (optional Bearer auth).
- Manager holds `SUPABASE_SECRET_KEY`; wrappers use `SUPABASE_PUBLISHABLE_KEY` where safe.
- **Folder Isolation:** Enforced at database level via RPC function filtering.
- **Access Control:** Agents cannot access folders not in their `config.folders` array.
- Supabase RLS: scope by `agent_id` and `folder`; enforce server-side checks in Manager.
- Never log secrets; redact keys in errors.
- CORS enabled for frontend integration (`Access-Control-Allow-Origin: *`).

## Error Handling
- Normalize errors to OpenAI-style: `type`, `message`, `code`, `param`.
- Provide consistent HTTP statuses; include `run_id` for correlation.

## Performance
- Chunk size ~1200 chars, overlap ~200.
- Batch embeddings; backoff on rate limits.
- Use HNSW index; widen `top_k` when applying filters to maintain result count.

## Testing
- Unit tests for adapter routing and OpenAI-shape compliance.
- Integration tests: upload → index → search → invoke.
- CLI scripts for local validation:
  - `npm run upload:supabase` - Upload and index file
  - `npm run schema:print` - Display SQL schema
  - `npm run test:folders` - Test folder access control
  - `npm run test:api:diag` - Test diagnostics endpoint
- **NEW:** Swagger UI at `/docs` for interactive API testing.

## Deployment
- Node API service; single process acceptable initially.
- Environment-based configuration; frontend is external and calls the APIs.
- Railway deployment ready with environment variables.
- **API Documentation:** Automatically available at `https://your-app.railway.app/docs`.

## Implementation Status

### ✅ Completed Features
1. **Folder-Based Access Control**
   - Database schema with `folder` and `is_private` columns
   - Folder filtering in `match_chunks()` RPC function
   - Agent configuration with `folders` array
   - Automatic folder detection from file paths
   - Multi-tenant knowledge base isolation

2. **Interactive API Documentation**
   - Swagger UI at `/docs` endpoint
   - OpenAPI 3.0 specification (`openapi.yaml`)
   - Landing page with quick links
   - Complete endpoint documentation with examples

3. **Manager API**
   - Agent CRUD operations
   - File upload/list/delete (Supabase Storage)
   - File indexing with chunking and embeddings
   - Vector search with folder restrictions
   - Diagnostics endpoint for system health

4. **Wrapper API**
   - OpenAI-compatible invoke endpoint
   - Streaming support
   - Tool calling (file_search)
   - Automatic folder enforcement
   - Rate limiting per appId

5. **Hybrid Agent CLI**
   - Interactive command-line interface
   - Folder access configuration via environment
   - File search with folder restrictions
   - 3rd party provider for chat completions

### 📋 Migration Tools
- `scripts/schema-fresh-install.sql` - Fresh installation
- `scripts/migration-add-folders.sql` - Add folders to existing schema
- `scripts/drop-and-recreate.sql` - Clean slate with folder support
- `MIGRATION-GUIDE.md` - Complete migration documentation

### 📚 Documentation
- `PROJECT-SPEC.MD` - This file (architecture and API reference)
- `FOLDER-SUPPORT.md` - Folder system usage guide
- `API-DOCS.md` - Frontend integration guide
- `MIGRATION-GUIDE.md` - Database migration instructions
- `openapi.yaml` - OpenAPI specification for code generation

## Next Steps
1. **Frontend Integration**
   - Use Swagger UI for API exploration
   - Generate TypeScript types from OpenAPI spec
   - Implement agent management UI
   - Build file upload interface with folder selection

2. **Enhanced Features**
   - Cascade delete for files (remove from storage + vector DB)
   - Folder permissions UI
   - Agent analytics (search queries, folder usage)
   - Batch file upload and indexing

3. **Production Readiness**
   - Add authentication middleware
   - Implement proper rate limiting
   - Set up monitoring and logging
   - Add health check endpoints for each service
   - Configure Supabase RLS policies

4. **Testing**
   - Add comprehensive test suite
   - Integration tests for folder isolation
   - Load testing for vector search
   - Frontend E2E tests
