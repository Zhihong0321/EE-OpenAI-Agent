# Frontend Manager Mode - Workflow Design Guide

## Overview

This document outlines the workflow logic for building a Manager Mode frontend that handles agent management, file operations, folder organization, and vector indexing.

**API Base URL:** `https://ee-openai-agent-production.up.railway.app`

**Authentication:** All Manager endpoints require Bearer token authentication:
```
Authorization: Bearer YOUR_MANAGER_TOKEN
```

---

## 1. Application Structure

### Recommended Pages/Views

1. **Dashboard** - System health and overview
2. **Agents** - Agent CRUD operations
3. **Files** - File upload, list, delete
4. **Folders** - Folder organization and access control
5. **Indexing** - Index files for vector search
6. **Search** - Test vector search functionality

---

## 2. Dashboard View

### Purpose
Display system health and quick stats

### Workflow

**On Page Load:**
1. Call `GET /health` to check API status
2. Call `GET /diagnostics` to check:
   - Supabase connection
   - Storage availability
   - Database schema status
   - Provider configuration

**Display:**
- ✅/❌ API Status
- ✅/❌ Supabase Connected
- ✅/❌ Storage Ready
- ✅/❌ Database Schema OK
- Quick stats: Total agents, Total files, Total indexed documents

**Error Handling:**
- If diagnostics show `schemaOk: false`, display warning: "Database schema not initialized. Run schema setup."
- If `storageOk: false`, show storage error message

---

## 3. Agents Management

### 3.1 List Agents

**Endpoint:** `GET /manager/agents`

**Workflow:**
1. Fetch all agents on page load
2. Display in table/card format with:
   - Agent ID
   - Accessible folders
   - Created date
   - Actions (Edit, Delete)

**UI Elements:**
- Search/filter by agent ID
- "Create New Agent" button
- Pagination if needed

### 3.2 Create Agent

**Endpoint:** `POST /manager/agents`

**Form Fields:**
- **Agent ID** (required, string) - Unique identifier
- **Model** (optional, dropdown) - Default: gpt-4o-mini
  - Options: gpt-4o, gpt-4o-mini, gpt-4-turbo
- **Folders** (multi-select) - Accessible folders
  - Default: ["shared"]
  - Options: shared, sales-team, support-team, custom folders
  - Special: ["*"] for admin access
- **Private Folder** (optional, string) - Dedicated folder for this agent
- **Temperature** (optional, slider 0-2) - Default: 0.7
- **Additional Config** (optional, JSON editor)

**Workflow:**
1. User fills form
2. Validate agent ID is unique
3. If "Private Folder" is set, automatically add it to folders list
4. Submit POST request
5. On success: Redirect to agents list with success message
6. On error: Display error message inline

**Request Example:**
```json
{
  "id": "sales-agent-1",
  "config": {
    "model": "gpt-4o",
    "temperature": 0.7,
    "folders": ["shared", "sales-team"],
    "private_folder": "sales-agent-1"
  }
}
```

### 3.3 Edit Agent

**Endpoint:** `PATCH /manager/agents/{id}`

**Workflow:**
1. Load existing agent data with `GET /manager/agents/{id}`
2. Pre-fill form with current values
3. Allow editing config only (ID is immutable)
4. Submit PATCH request
5. On success: Update list and show success message

### 3.4 Delete Agent

**Endpoint:** `DELETE /manager/agents/{id}`

**Workflow:**
1. Show confirmation dialog: "Delete agent {id}? This will not delete associated files."
2. On confirm: Send DELETE request
3. On success: Remove from list and show success message
4. On error: Display error message

**Important:** Deleting an agent does NOT delete its files or indexed documents. Consider adding a warning about orphaned data.

---

## 4. Files Management

### 4.1 List Files

**Endpoint:** `GET /manager/files?bucket={bucket}&prefix={prefix}`

**Workflow:**
1. On page load, fetch files from default bucket
2. Display in table/grid with:
   - File name
   - Folder (extracted from path)
   - Size
   - Upload date
   - Actions (Download, Delete, Index)

**UI Elements:**
- Bucket selector (if multiple buckets)
- Folder filter dropdown
- Search by filename
- "Upload File" button
- Bulk actions (Delete multiple, Index multiple)

**Folder Extraction:**
- Parse file path: `sales-team/pricing.pdf` → Folder: `sales-team`
- Files without `/` → Folder: `shared`

### 4.2 Upload File

**Endpoint:** `POST /manager/files/upload-browser`

**Content-Type:** `multipart/form-data`

**IMPORTANT:** Frontend should ONLY use this backend API endpoint. DO NOT connect directly to Supabase from the frontend.

**Form Fields:**
- **File** (file input, required)
- **Folder** (dropdown, required) - Destination folder
  - Options: shared, sales-team, support-team, or custom
- **Overwrite** (checkbox) - Upsert if exists

**Frontend Code Example:**
```javascript
async function uploadFile(file, folder, upsert = false) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)
  formData.append('upsert', upsert.toString())
  
  const response = await fetch('https://your-api.railway.app/manager/files/upload-browser', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_MANAGER_TOKEN'
      // DO NOT set Content-Type, browser will set it with boundary
    },
    body: formData
  })
  
  if (!response.ok) throw new Error('Upload failed')
  return await response.json() // { bucket, key, folder }
}
```

**Workflow:**
1. User selects file and folder
2. Validate file size/type if needed
3. Create FormData and append file + metadata
4. POST to `/manager/files/upload-browser`
5. On success: Refresh file list and show success message
6. On error: Display error message

**Auto-Index Option:**
Add checkbox "Index after upload" to automatically trigger indexing after successful upload.

### 4.3 Delete File

**Endpoint:** `DELETE /manager/files/{key}?bucket={bucket}`

**Workflow:**
1. Show confirmation: "Delete {filename}? This will also remove it from search index."
2. On confirm: Send DELETE request with URL-encoded file key
3. On success: Remove from list
4. Consider: Also delete associated document/chunks from database

**URL Encoding:**
```javascript
const encodedKey = encodeURIComponent('sales-team/pricing.pdf')
fetch(`/manager/files/${encodedKey}?bucket=agent-files`, { method: 'DELETE' })
```

### 4.4 Download File

**Endpoint:** `GET /manager/files/url?bucket={bucket}&key={key}`

**Workflow:**
1. Request signed URL from API
2. Open signed URL in new tab or trigger download
3. Signed URLs expire after 1 hour (default)

---

## 5. Folder Management

### 5.1 Folder Structure View

**Purpose:** Visualize folder hierarchy and access control

**Data Source:** Aggregate from:
- File list (extract unique folders from paths)
- Agent configs (get folder access lists)

**Display:**
```
📁 shared (3 files, 5 agents)
📁 sales-team (7 files, 2 agents)
📁 support-team (4 files, 3 agents)
📁 sales-agent-1 (private, 1 file, 1 agent)
```

**UI Elements:**
- Tree view or card grid
- Click folder to filter files
- Show agent access per folder
- "Create Folder" button (creates via file upload)

### 5.2 Folder Access Control

**Purpose:** Manage which agents can access which folders

**Workflow:**
1. Display matrix: Folders (rows) × Agents (columns)
2. Checkboxes for access permissions
3. On change: Update agent config via `PATCH /manager/agents/{id}`

**Example Matrix:**
```
              | sales-agent-1 | support-agent-1 | admin-agent
shared        |      ✓        |        ✓        |      ✓
sales-team    |      ✓        |        ✗        |      ✓
support-team  |      ✗        |        ✓        |      ✓
```

**Workflow:**
1. User toggles checkbox
2. Update agent's `config.folders` array
3. Send PATCH request
4. On success: Update UI
5. On error: Revert checkbox and show error

### 5.3 Create Folder

**Note:** Folders are created implicitly when uploading files with folder paths.

**Workflow:**
1. User enters new folder name
2. Validate: lowercase, hyphens only, no special chars
3. Upload a placeholder file (e.g., `.gitkeep`) to create folder
4. Or: Just add folder to agent config and create on first file upload

---

## 6. Indexing Management

### 6.1 Index File

**Endpoint:** `POST /manager/index`

**Purpose:** Process file for vector search (chunk, embed, store)

**Form Fields:**
- **File** (dropdown, required) - Select from uploaded files
- **Agent ID** (dropdown, required) - Which agent owns this
- **Folder** (auto-detected from file path, can override)
- **Title** (optional, text) - Document title for display
- **Chunk Size** (optional, number) - Default: 1200 chars
- **Chunk Overlap** (optional, number) - Default: 200 chars
- **Embedding Model** (dropdown) - Default: text-embedding-3-small

**Workflow:**
1. User selects file from list
2. Auto-populate folder from file path
3. Select agent (filter by agents with access to this folder)
4. Submit indexing request
5. Show progress indicator (indexing can take time)
6. On success: Show document ID and chunk count
7. On error: Display error message

**Request Example:**
```json
{
  "bucket": "agent-files",
  "file_key": "sales-team/pricing.pdf",
  "agent_id": "sales-agent-1",
  "folder": "sales-team",
  "title": "Pricing Guide 2024",
  "chunk_options": {
    "size": 1200,
    "overlap": 200
  },
  "embedding_model": "text-embedding-3-small"
}
```

**Response:**
```json
{
  "documentId": "uuid-here",
  "chunkCount": 15
}
```

### 6.2 Bulk Indexing

**Workflow:**
1. Allow selecting multiple files
2. Choose agent and folder settings
3. Queue indexing jobs
4. Show progress for each file
5. Display summary: X succeeded, Y failed

**UI Considerations:**
- Progress bars per file
- Ability to cancel pending jobs
- Retry failed jobs

### 6.3 Re-index File

**Workflow:**
1. Delete existing document and chunks
2. Re-upload and index with new settings
3. Useful when changing chunk size or embedding model

---

## 7. Search Testing

### 7.1 Vector Search

**Endpoint:** `POST /manager/search`

**Purpose:** Test search functionality before deploying to agents

**Form Fields:**
- **Agent ID** (dropdown, required) - Determines folder access
- **Query** (text, required) - Search query
- **Folders** (multi-select, optional) - Override agent's default folders
- **Top K** (number, 1-50) - Number of results, default: 5
- **Embedding Model** (dropdown) - Must match indexing model

**Workflow:**
1. User enters search query
2. Select agent (determines folder access)
3. Optionally override folders
4. Submit search request
5. Display results with:
   - Chunk content (truncated)
   - Similarity score
   - Source document title
   - Folder
   - Chunk index
6. Click result to expand full content

**Request Example:**
```json
{
  "agent_id": "sales-agent-1",
  "query": "What are the pricing tiers?",
  "folders": ["shared", "sales-team"],
  "top_k": 5
}
```

**Response Display:**
```
Results for "What are the pricing tiers?" (5 results)

1. Score: 0.89 | Folder: sales-team | Document: Pricing Guide
   "Our pricing tiers are structured as follows: Basic ($10/mo), Pro ($50/mo)..."
   [View Full Chunk] [View Document]

2. Score: 0.76 | Folder: shared | Document: Company FAQ
   "Pricing information can be found in our sales materials..."
   [View Full Chunk] [View Document]
```

### 7.2 Search Analytics

**Optional Enhancement:**
- Track popular queries
- Show which documents are most relevant
- Identify gaps in knowledge base

---

## 8. Workflow Sequences

### 8.1 Complete Setup Flow

**For new deployment:**

1. **Check System Health**
   - Visit Dashboard
   - Verify all diagnostics are green
   - If schema missing, run setup script

2. **Create Agent**
   - Go to Agents page
   - Click "Create Agent"
   - Set ID, model, folders
   - Save

3. **Upload Files**
   - Go to Files page
   - Click "Upload File"
   - Select file and folder
   - Upload

4. **Index Files**
   - Go to Indexing page
   - Select uploaded file
   - Choose agent
   - Click "Index"
   - Wait for completion

5. **Test Search**
   - Go to Search page
   - Select agent
   - Enter test query
   - Verify results

6. **Deploy to Production**
   - Use agent via `/x-app/{agentId}/invoke` endpoint

### 8.2 Add New Knowledge to Existing Agent

1. Upload file to appropriate folder
2. Index file with agent ID
3. Test search to verify
4. Agent automatically has access

### 8.3 Create Team-Specific Agent

1. Create folder (e.g., "marketing-team")
2. Create agent with folder access: `["shared", "marketing-team"]`
3. Upload team files to folder
4. Index files with agent ID
5. Agent can only access shared + marketing-team files

### 8.4 Grant Agent Access to New Folder

1. Go to Agents page
2. Edit agent
3. Add folder to `config.folders` array
4. Save
5. Agent can now search that folder

---

## 9. Error Handling

### Common Errors and Solutions

**401 Unauthorized**
- Check Bearer token is set correctly
- Verify MANAGER_TOKEN environment variable

**400 Missing Schema**
- Database tables not created
- Run schema setup script
- Check diagnostics page

**500 Indexing Failed**
- File might be corrupted or unsupported format
- Check file size (very large files may timeout)
- Verify embedding model is available

**404 Agent Not Found**
- Agent ID doesn't exist
- Create agent first

**Empty Search Results**
- Agent doesn't have access to folder
- File not indexed yet
- Query doesn't match content

### User-Friendly Error Messages

Instead of showing raw API errors, translate to:
- "Authentication failed. Please check your access token."
- "This agent doesn't have access to that folder."
- "File indexing failed. Please try again or contact support."

---

## 10. State Management

### Recommended State Structure

```javascript
{
  auth: {
    token: string,
    isAuthenticated: boolean
  },
  system: {
    health: { status: 'ok' | 'error' },
    diagnostics: { ... }
  },
  agents: {
    list: Agent[],
    selected: Agent | null,
    loading: boolean,
    error: string | null
  },
  files: {
    list: File[],
    folders: string[],
    selectedFolder: string | null,
    loading: boolean
  },
  indexing: {
    jobs: IndexJob[],
    inProgress: boolean
  },
  search: {
    query: string,
    results: SearchResult[],
    loading: boolean
  }
}
```

### Key Actions

- `fetchAgents()` - Load all agents
- `createAgent(data)` - Create new agent
- `updateAgent(id, data)` - Update agent config
- `deleteAgent(id)` - Delete agent
- `fetchFiles(bucket, prefix)` - Load files
- `uploadFile(file, folder)` - Upload file
- `deleteFile(key)` - Delete file
- `indexFile(data)` - Index file for search
- `search(query, agentId, folders)` - Vector search

---

## 11. UI/UX Best Practices

### Loading States
- Show spinners during API calls
- Disable buttons while processing
- Display progress for long operations (indexing)

### Success Feedback
- Toast notifications for successful actions
- Green checkmarks for completed tasks
- Auto-dismiss after 3-5 seconds

### Error Feedback
- Red error messages inline
- Detailed error info in expandable section
- Retry buttons where applicable

### Confirmation Dialogs
- Delete operations (agents, files)
- Bulk operations
- Destructive actions

### Empty States
- "No agents yet. Create your first agent."
- "No files in this folder. Upload files to get started."
- "No search results. Try a different query."

### Keyboard Shortcuts
- `Ctrl+K` - Quick search
- `Ctrl+N` - New agent/file
- `Esc` - Close modals

---

## 12. Security Considerations

### Token Management
- Store Bearer token securely (httpOnly cookie or secure storage)
- Never expose token in URLs or logs
- Implement token refresh if needed

### Input Validation
- Sanitize agent IDs (alphanumeric, hyphens only)
- Validate folder names
- Check file types before upload
- Limit file sizes

### Access Control
- Verify user has permission for Manager operations
- Don't expose sensitive config in frontend
- Audit log for critical actions

---

## 13. Performance Optimization

### Pagination
- Implement for large agent/file lists
- Use cursor-based pagination if available

### Caching
- Cache agent list (refresh on mutations)
- Cache folder structure
- Cache diagnostics (refresh every 5 minutes)

### Lazy Loading
- Load file list on demand per folder
- Defer loading search results until query submitted

### Debouncing
- Debounce search input (300ms)
- Debounce file filter (200ms)

---

## 14. Testing Checklist

### Functional Tests
- [ ] Create agent with various configs
- [ ] Update agent folders
- [ ] Delete agent
- [ ] Upload file to different folders
- [ ] Delete file
- [ ] Index file successfully
- [ ] Search returns relevant results
- [ ] Folder access control works
- [ ] Error handling displays correctly

### Edge Cases
- [ ] Agent with no folders (should default to shared)
- [ ] Agent with ["*"] admin access
- [ ] File with special characters in name
- [ ] Very large file upload
- [ ] Search with no results
- [ ] Indexing already-indexed file

### Browser Compatibility
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## 15. API Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/diagnostics` | GET | System diagnostics |
| `/manager/agents` | GET | List agents |
| `/manager/agents` | POST | Create agent |
| `/manager/agents/{id}` | GET | Get agent |
| `/manager/agents/{id}` | PATCH | Update agent |
| `/manager/agents/{id}` | DELETE | Delete agent |
| `/manager/files/upload` | POST | Upload file |
| `/manager/files` | GET | List files |
| `/manager/files/{key}` | DELETE | Delete file |
| `/manager/files/url` | GET | Get signed URL |
| `/manager/index` | POST | Index file |
| `/manager/search` | POST | Vector search |

**All Manager endpoints require:**
```
Authorization: Bearer YOUR_MANAGER_TOKEN
Content-Type: application/json
```

---

## 16. Next Steps

After implementing Manager Mode:

1. **Build Agent Invocation UI** - Frontend for `/x-app/{appId}/invoke`
2. **Add Analytics Dashboard** - Track usage, popular queries
3. **Implement Webhooks** - Notify on indexing completion
4. **Add Batch Operations** - Bulk upload, bulk index
5. **Create Admin Panel** - User management, token management
6. **Build Mobile App** - React Native or Flutter version

---

## Summary

This Manager Mode frontend enables:
- ✅ Complete agent lifecycle management
- ✅ File upload and organization
- ✅ Folder-based access control
- ✅ Vector indexing for semantic search
- ✅ Search testing and validation
- ✅ System health monitoring

The workflow is designed to be intuitive for non-technical users while providing power users with advanced configuration options.

**Key Principle:** Every action should provide clear feedback and handle errors gracefully. The user should always know what's happening and what to do next.
