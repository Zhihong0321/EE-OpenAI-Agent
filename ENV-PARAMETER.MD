# Environment Parameters

## Summary
- Centralizes all environment variables used by Wrapper and Manager services.
- Includes third‑party OpenAI‑compatible provider routing and Supabase credentials.
- Values must be supplied via environment; never commit real secrets to source control.

## Third‑Party Provider (OpenAI‑compatible)
- `THIRD_PARTY_BASE_URL`
  - Purpose: Base URL for provider (e.g., `https://api.bltcy.ai/v1/`).
  - Required: Yes.
  - Source: Found in `e:\EE-Openai-Agent\.env:3`.
- `THIRD_PARTY_API_KEY`
  - Purpose: Bearer key for provider authentication.
  - Required: Yes.
  - Source: Found in `e:\EE-Openai-Agent\.env:2`.
  - Note: Keep secret; do not commit. Masked example: `sk-****************AlD`.

## Supabase
- `SUPABASE_URL`
  - Purpose: Project URL (e.g., `https://gaqiqwqsepgxxcoqacze.supabase.co`).
  - Required: Yes.
  - Source: Provided by you.
- `SUPABASE_PUBLISHABLE_KEY`
  - Purpose: Publishable/anon key for client-safe operations.
  - Required: Recommended for wrapper read paths.
  - Source: Provided by you. Masked example: `sb_publishable_GGH3z8Wf...YEdkeVHx`.
- `SUPABASE_SECRET_KEY`
  - Purpose: Secret key for admin operations (buckets, indexing, server-side CRUD).
  - Required: Manager only; never expose to clients.
  - Source: Provided by you. Masked example: `sb_secret_0Bk_6Zlh...Na2pVPnn`.
- `SUPABASE_BUCKET`
  - Purpose: Storage bucket name (e.g., `agent-files`).
  - Required: Yes (defaults to `agent-files`).
  - Source: Created and used in scripts.

## Application
- `PORT`
  - Purpose: HTTP server port.
  - Required: Optional; default 3000.
- `NODE_ENV`
  - Purpose: Runtime mode (`development`/`production`).
  - Required: Optional.
- `AGENT_ID`
  - Purpose: Scope for vector search and file association per wrapped app.
  - Required: Recommended. Example: `eternalgy`.

## Legacy / Optional OpenAI
- `OPENAI_API_KEY`
  - Purpose: Used previously for OpenAI Assistants/file search; not required after Supabase migration.
  - Source: Found in `e:\EE-Openai-Agent\.env:6`.
- `OPENAI_BASE_URL`
  - Purpose: Optional override for OpenAI; typically unused.

## Models (Provider Parameters)
- Chat/completions models
  - `gpt-4o`, `gpt-4o-mini` (used for answer generation and lightweight tasks).
- Embeddings model
  - `text-embedding-3-small` (1536‑dim). Aligns with `vector(1536)` in Supabase.

## Where They’re Read
- Third‑party provider
  - `hybrid-agent.js:1-10,104-141,169-184` (routing and calls).
- Supabase
  - `supabase-files.js:1-22,35-52,54-71,73-88` (Storage CRUD).
  - `supabase-vector.js:1-18,20-28,46-76` (index/search with vectors).
- CLI integration
  - `scripts/upload-to-supabase.js:1-17` (upload + index helper).
  - `scripts/list-buckets.js:1-14` (verify buckets).
- Hybrid CLI
  - `index-hybrid.js:8-12,20-22,26-35,43-47,71-74` (env checks and Supabase display).

## Security & Handling
- Never commit real secret values. Use environment injection at runtime.
- The Manager service uses `SUPABASE_SECRET_KEY` and enforces RLS by `agent_id` on data access.
- Wrappers use `SUPABASE_PUBLISHABLE_KEY` when possible; server-side endpoints handle privileged ops.
- Provider key (`THIRD_PARTY_API_KEY`) is required on server; do not expose in frontend.

## Example .env Template
```
THIRD_PARTY_BASE_URL=https://api.bltcy.ai/v1/
THIRD_PARTY_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx

SUPABASE_URL=https://<project_ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_BUCKET=agent-files

PORT=3000
NODE_ENV=development
AGENT_ID=default
```

## Notes
- Keys provided by you are recognized and masked in this document; set them via environment on the server.
- For embeddings and search, ensure Supabase pgvector tables exist with `vector(1536)` and HNSW index.
