# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added - Folder-Based Access Control (2024)

#### Database Schema
- Added `folder` column to `documents` table (text, default: 'shared')
- Added `is_private` column to `documents` table (boolean, default: false)
- Created `idx_documents_folder` index for fast folder filtering
- Created `idx_documents_agent_folder` composite index for agent+folder queries
- Updated `match_chunks()` RPC function to accept `folders` array parameter
- Function now filters documents by folder access before similarity search

#### API Endpoints
- **POST /manager/index** - Now accepts `folder` parameter for file tagging
- **POST /manager/search** - Now accepts `folders` array for access control
- **POST /x-app/:appId/invoke** - Automatically enforces agent's folder access
- **GET /** - Added landing page with documentation links
- **GET /docs** - Added interactive Swagger UI documentation
- **GET /openapi.yaml** - Added OpenAPI 3.0 specification download
- **GET /diagnostics** - Added system diagnostics endpoint
- **GET /schema** - Added SQL schema endpoint

#### Agent Configuration
- Agents now support `config.folders` array for folder access control
- Added `AGENT_FOLDERS` environment variable (comma-separated list)
- Support for wildcard `*` for admin access to all folders
- Folder access displayed in CLI startup

#### Features
- **Multi-Tenant Isolation**: Each agent can only access configured folders
- **Hierarchical Folders**: Support for `shared/`, `team-name/`, `agent-id/` structure
- **Auto-Detection**: Folder automatically extracted from file path
- **Context Attribution**: Search results show which folder each result came from
- **Flexible Override**: Per-query folder override support

#### CLI & Tools
- Updated `hybrid-agent.js` with folder support
- Updated `index-hybrid.js` to display folder access
- Added `test-agent-folders.js` for testing folder functionality
- Added `npm run test:folders` script

#### Documentation
- Created `FOLDER-SUPPORT.md` - Complete folder system guide
- Created `API-DOCS.md` - Frontend integration guide
- Created `MIGRATION-GUIDE.md` - Database migration instructions
- Updated `PROJECT-SPEC.MD` - Architecture and API reference
- Created `CHANGELOG.md` - This file

#### Migration Scripts
- `scripts/schema-fresh-install.sql` - Fresh installation with folder support
- `scripts/migration-add-folders.sql` - Add folders to existing schema
- `scripts/drop-and-recreate.sql` - Clean slate migration

### Added - Interactive API Documentation (2024)

#### Swagger UI Integration
- Installed `swagger-ui-express` and `yamljs` dependencies
- Created comprehensive `openapi.yaml` specification
- Integrated Swagger UI at `/docs` endpoint
- Added landing page at `/` with quick links

#### Documentation Features
- Interactive "Try it out" functionality
- Request/response examples for all endpoints
- Authentication testing support
- Copy as cURL commands
- TypeScript type generation support

#### Developer Experience
- Frontend team can test APIs directly in browser
- Auto-generated API documentation
- OpenAPI spec available for code generators
- Postman/Insomnia import support

### Changed

#### Search Behavior
- Search now filters by folder access by default
- Results include `folder` field for attribution
- Fallback to client-side filtering if RPC fails

#### File Indexing
- Files automatically tagged with folder from path
- Explicit folder parameter supported
- Defaults to 'shared' if no folder detected

#### Agent Invocation
- Context now includes folder source: `# Context (from folder-name)`
- Wrapper checks agent config for folder access
- Automatic enforcement of folder restrictions

### Fixed
- Variable name conflict in `supabase-vector.js` (query → dbQuery)
- Syntax error in `index-hybrid.js` (unterminated string)
- Missing folder parameter in search fallback logic

### Security
- Folder isolation enforced at database level
- Agents cannot access unauthorized folders
- Server-side validation of folder access
- CORS enabled for frontend integration

## [1.0.0] - Initial Release

### Added
- Basic agent wrapper system
- Supabase integration for file storage
- Vector search with pgvector
- 3rd party provider routing (bltcy.ai)
- Manager API for agent/file management
- Hybrid agent CLI
- OpenAI-compatible API endpoints

---

## Migration Notes

### From Pre-Folder Schema
If you have an existing deployment without folder support:

1. **Backup your data** (optional but recommended)
2. Choose migration path:
   - **Keep data**: Use `scripts/migration-add-folders.sql`
   - **Fresh start**: Use `scripts/drop-and-recreate.sql`
3. Run SQL in Supabase Dashboard → SQL Editor
4. Update agent configurations with folder access
5. Re-index files with folder tags (if keeping data)

See `MIGRATION-GUIDE.md` for detailed instructions.

### Environment Variables
Add these new variables to your `.env`:
```env
AGENT_FOLDERS=shared,sales-team,support-team
MANAGER_TOKEN=your-secret-token  # Optional
```

---

## Upgrade Guide

### For Developers
1. Pull latest code
2. Run `npm install` (new dependencies: swagger-ui-express, yamljs)
3. Apply database migration (see Migration Notes)
4. Update `.env` with new variables
5. Restart services

### For Frontend Teams
1. Visit `/docs` for interactive API documentation
2. Download `/openapi.yaml` for type generation
3. Update API calls to include `folders` parameter where needed
4. Handle new `folder` field in search results

---

## Breaking Changes

### v1.0.0 → v2.0.0 (Folder Support)
- **Database Schema**: New columns added to `documents` table
- **API Responses**: Search results now include `folder` field
- **Agent Config**: Agents should specify `folders` array (defaults to `['shared']`)
- **Search Behavior**: Now filters by folder access (was agent_id only)

### Migration Required
Yes - database schema changes require migration script.

### Backward Compatibility
- Existing agents default to `['shared']` folder access
- Existing documents auto-tagged as 'shared' during migration
- API endpoints maintain backward compatibility with optional parameters

---

## Future Roadmap

### Planned Features
- [ ] Cascade delete for files (storage + vector DB)
- [ ] Folder permissions UI
- [ ] Agent analytics dashboard
- [ ] Batch file upload
- [ ] Automatic folder creation
- [ ] Folder sharing between agents
- [ ] Audit logs for folder access
- [ ] File versioning
- [ ] Advanced search filters
- [ ] Real-time collaboration

### Under Consideration
- [ ] Nested folder hierarchies
- [ ] Folder-level encryption
- [ ] Custom folder permissions (read/write/admin)
- [ ] Folder templates
- [ ] Automated folder organization
- [ ] Integration with external storage providers

---

## Support

For questions or issues:
1. Check `FOLDER-SUPPORT.md` for folder system usage
2. Check `API-DOCS.md` for API integration
3. Check `MIGRATION-GUIDE.md` for database migrations
4. Visit `/docs` for interactive API testing
5. Review `PROJECT-SPEC.MD` for architecture details
