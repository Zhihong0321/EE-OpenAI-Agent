# Folder-Based Access Control

## Overview

The system now supports folder-based file organization with access control per agent. Each agent can be configured to access specific folders, enabling multi-tenant knowledge bases with proper isolation.

## Folder Structure

```
Supabase Storage (agent-files bucket):
├── shared/                    # Accessible by all agents (default)
│   ├── company-policy.pdf
│   └── general-faq.md
├── sales-team/                # Only sales agents
│   ├── pricing.pdf
│   └── sales-playbook.md
├── support-team/              # Only support agents
│   ├── troubleshooting.md
│   └── ticket-templates.md
└── agent-123/                 # Private to specific agent
    └── custom-knowledge.pdf
```

## Database Schema Changes

### Documents Table
```sql
-- Added columns:
folder text not null default 'shared'
is_private boolean default false

-- Added indexes:
CREATE INDEX idx_documents_folder ON documents(folder);
CREATE INDEX idx_documents_agent_folder ON documents(agent_id, folder);
```

### match_chunks Function
```sql
-- Added parameter:
folders text[] default array['shared']

-- Returns additional field:
folder text

-- Filters by folder access in WHERE clause
```

## Agent Configuration

### Create Agent with Folder Access

```javascript
POST /manager/agents
{
  "id": "sales-agent-1",
  "config": {
    "model": "gpt-4o",
    "folders": ["shared", "sales-team"],  // Accessible folders
    "private_folder": "sales-agent-1"     // Optional private folder
  }
}
```

### Configuration Options

**folders** (array of strings)
- List of folders this agent can access
- Always includes 'shared' by default
- Use `["*"]` for admin access to all folders

**private_folder** (string, optional)
- Dedicated folder for this agent only
- Automatically added to folders list

## File Management

### Upload File to Folder

```javascript
POST /manager/files/upload
{
  "bucket": "agent-files",
  "file_path": "./pricing.pdf",
  "dest_path": "sales-team/pricing.pdf",  // Folder in path
  "folder": "sales-team"                   // Explicit folder tag
}
```

**Folder Detection:**
- If `folder` parameter provided → uses that
- Otherwise extracts from `dest_path` (first segment before `/`)
- Falls back to `'shared'` if no folder detected

### Index File with Folder

```javascript
POST /manager/index
{
  "bucket": "agent-files",
  "file_key": "sales-team/pricing.pdf",
  "agent_id": "sales-agent-1",
  "folder": "sales-team",  // Optional, auto-detected from file_key
  "title": "Pricing Guide"
}
```

### Search with Folder Restrictions

```javascript
POST /manager/search
{
  "agent_id": "sales-agent-1",
  "query": "pricing tiers",
  "folders": ["shared", "sales-team"],  // Only search these folders
  "top_k": 5
}
```

**Response includes folder info:**
```json
{
  "agent_id": "sales-agent-1",
  "query": "pricing tiers",
  "folders": ["shared", "sales-team"],
  "results": [
    {
      "chunk_id": "uuid",
      "content": "Our pricing tiers are...",
      "score": 0.89,
      "folder": "sales-team",
      "document": {
        "id": "uuid",
        "title": "Pricing Guide",
        "folder": "sales-team"
      }
    }
  ]
}
```

## Wrapper Integration

### Automatic Folder Enforcement

When invoking a wrapper, folder access is automatically enforced:

```javascript
POST /x-app/sales-agent-1/invoke
{
  "messages": [{ "role": "user", "content": "What's our pricing?" }],
  "tools": [{ "type": "file_search" }],
  "metadata": {
    "file_query": "pricing",
    "folders": ["shared", "sales-team"]  // Optional, uses agent config if omitted
  }
}
```

**Folder Resolution:**
1. Check `metadata.folders` in request
2. Fall back to agent's `config.folders`
3. Default to `['shared']`

**Context includes folder info:**
```
# Context (from sales-team)
Our pricing tiers are...

# Context (from shared)
Company policy states...
```

## Access Control Examples

### Sales Team Agent
```javascript
{
  "id": "sales-agent-1",
  "config": {
    "folders": ["shared", "sales-team"]
  }
}
```
- ✅ Can access: `shared/*`, `sales-team/*`
- ❌ Cannot access: `support-team/*`, `agent-123/*`

### Support Team Agent
```javascript
{
  "id": "support-agent-1",
  "config": {
    "folders": ["shared", "support-team"]
  }
}
```
- ✅ Can access: `shared/*`, `support-team/*`
- ❌ Cannot access: `sales-team/*`, `agent-123/*`

### Admin Agent
```javascript
{
  "id": "admin-agent",
  "config": {
    "folders": ["*"],
    "is_admin": true
  }
}
```
- ✅ Can access: All folders

### Agent with Private Folder
```javascript
{
  "id": "custom-agent",
  "config": {
    "folders": ["shared", "custom-agent"],
    "private_folder": "custom-agent"
  }
}
```
- ✅ Can access: `shared/*`, `custom-agent/*`
- ❌ Cannot access: Other private folders

## Migration Guide

### Step 1: Apply Schema Changes

Run the updated schema:
```bash
npm run schema:print > schema.sql
# Apply to Supabase via SQL Editor
```

### Step 2: Tag Existing Documents

```sql
-- Set all existing documents to 'shared' folder
UPDATE documents 
SET folder = 'shared' 
WHERE folder IS NULL OR folder = '';
```

### Step 3: Update Agent Configurations

```javascript
// Update each agent with folder access
PATCH /manager/agents/sales-agent-1
{
  "config": {
    "folders": ["shared", "sales-team"]
  }
}
```

### Step 4: Organize Files

Move files to appropriate folders in Supabase Storage:
- Create folder structure
- Move/copy files
- Re-index with correct folder tags

## Best Practices

### Folder Naming
- Use lowercase with hyphens: `sales-team`, `support-team`
- Keep names short and descriptive
- Avoid special characters

### Shared Folder
- Use for company-wide knowledge
- Keep it minimal to avoid clutter
- Review access regularly

### Private Folders
- One per agent if needed
- Use agent ID as folder name
- For agent-specific customizations

### Team Folders
- Group by department or function
- Document access policies
- Regular audits

### Admin Access
- Limit to necessary agents only
- Use for management/oversight
- Log admin actions

## Security Considerations

1. **Folder Isolation**
   - Agents cannot access unauthorized folders
   - Enforced at database level (RPC function)
   - Validated in Manager before search

2. **Default to Shared**
   - If no folders specified, defaults to `['shared']`
   - Prevents accidental access to all folders

3. **No Wildcard by Default**
   - `["*"]` must be explicitly configured
   - Reserved for admin agents

4. **Audit Trail**
   - Track which agent accessed which folders
   - Log search queries with folder context

## Troubleshooting

### Agent Can't Find Files

**Check:**
1. Agent's `config.folders` includes the file's folder
2. File was indexed with correct folder tag
3. Folder name matches exactly (case-sensitive)

### Files in Wrong Folder

**Fix:**
1. Delete document from database
2. Re-upload file to correct folder
3. Re-index with correct folder parameter

### Search Returns No Results

**Debug:**
```javascript
// Test search with explicit folders
POST /manager/search
{
  "agent_id": "test-agent",
  "query": "test",
  "folders": ["*"]  // Search all folders
}
```

## API Reference

### Updated Endpoints

**POST /manager/index**
- Added: `folder` (string, optional)

**POST /manager/search**
- Added: `folders` (array, optional, default: `['shared']`)

**POST /x-app/:appId/invoke**
- Added: `metadata.folders` (array, optional)

### Response Changes

All search results now include:
- `folder` field at result level
- `document.folder` field in document object

## Examples

### Complete Workflow

```javascript
// 1. Create agent with folder access
POST /manager/agents
{
  "id": "sales-agent",
  "config": {
    "folders": ["shared", "sales-team"]
  }
}

// 2. Upload file to sales folder
POST /manager/files/upload
{
  "file_path": "./pricing.pdf",
  "dest_path": "sales-team/pricing.pdf"
}

// 3. Index with folder
POST /manager/index
{
  "file_key": "sales-team/pricing.pdf",
  "agent_id": "sales-agent",
  "folder": "sales-team"
}

// 4. Search (automatically restricted to agent's folders)
POST /manager/search
{
  "agent_id": "sales-agent",
  "query": "pricing"
}

// 5. Invoke agent (uses folder restrictions)
POST /x-app/sales-agent/invoke
{
  "messages": [{ "role": "user", "content": "What's our pricing?" }],
  "tools": [{ "type": "file_search" }],
  "metadata": { "file_query": "pricing" }
}
```

## Summary

Folder support enables:
- ✅ Multi-tenant knowledge bases
- ✅ Team-based access control
- ✅ Private agent folders
- ✅ Shared company knowledge
- ✅ Secure folder isolation
- ✅ Flexible permission management

All changes are backward compatible - existing agents default to `['shared']` folder access.
