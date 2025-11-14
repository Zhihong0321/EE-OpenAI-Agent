# 🤖 Agent Management Guide for Frontend

## Overview

The backend now supports full agent management through the Manager API. You can list, create, update, and delete agents programmatically.

---

## Quick Start

### 1. Import the Functions

```typescript
import { 
  listAgents, 
  getAgent, 
  createAgent, 
  updateAgent, 
  deleteAgent 
} from './lib/frontend-api-client'
```

### 2. List All Agents

```typescript
const agents = await listAgents()

console.log(agents)
// [
//   {
//     id: 'main-agent',
//     config: {
//       name: 'Main Agent',
//       description: 'Primary AI agent with file search',
//       folders: ['shared'],
//       model: 'gpt-4o-mini'
//     },
//     created_at: '2025-11-14T04:31:56.044Z'
//   }
// ]
```

### 3. Display in UI

```tsx
function AgentList() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAgents() {
      try {
        const data = await listAgents()
        setAgents(data)
      } catch (error) {
        console.error('Failed to load agents:', error)
      } finally {
        setLoading(false)
      }
    }
    loadAgents()
  }, [])

  if (loading) return <div>Loading agents...</div>

  if (agents.length === 0) {
    return <div>No agents found. Create one to get started.</div>
  }

  return (
    <div>
      <h2>Available Agents ({agents.length})</h2>
      {agents.map(agent => (
        <div key={agent.id} className="agent-card">
          <h3>{agent.config?.name || agent.id}</h3>
          <p>{agent.config?.description}</p>
          <p>Folders: {agent.config?.folders?.join(', ')}</p>
          <p>Model: {agent.config?.model}</p>
          <button onClick={() => chatWithAgent(agent.id, messages)}>
            Chat
          </button>
        </div>
      ))}
    </div>
  )
}
```

---

## API Reference

### List All Agents

```typescript
const agents = await listAgents()
```

**Returns:**
```typescript
Array<{
  id: string
  config?: {
    name?: string
    description?: string
    folders?: string[]
    model?: string
  }
  created_at: string
}>
```

**Example Response:**
```json
[
  {
    "id": "main-agent",
    "config": {
      "name": "Main Agent",
      "description": "Primary AI agent",
      "folders": ["shared"],
      "model": "gpt-4o-mini"
    },
    "created_at": "2025-11-14T04:31:56.044Z"
  }
]
```

---

### Get Single Agent

```typescript
const agent = await getAgent('main-agent')
```

**Returns:**
```typescript
{
  id: string
  config?: any
  created_at: string
}
```

---

### Create New Agent

```typescript
const newAgent = await createAgent('sales-agent', {
  name: 'Sales Agent',
  description: 'Agent for sales team',
  folders: ['shared', 'sales-team'],
  model: 'gpt-4o'
})
```

**Parameters:**
- `agentId` (string) - Unique identifier for the agent
- `config` (object, optional) - Agent configuration
  - `name` (string) - Display name
  - `description` (string) - Description
  - `folders` (string[]) - Folders to search in
  - `model` (string) - AI model to use

**Returns:** Created agent object

---

### Update Agent

```typescript
const updated = await updateAgent('main-agent', {
  folders: ['shared', 'sales-team', 'support-team'],
  model: 'gpt-4o'
})
```

**Parameters:**
- `agentId` (string) - Agent ID to update
- `config` (object) - Updated configuration (merged with existing)

**Returns:** Updated agent object

---

### Delete Agent

```typescript
await deleteAgent('old-agent')
```

**Parameters:**
- `agentId` (string) - Agent ID to delete

**Returns:** `{ deleted: boolean }`

---

## Current Production Agent

**Agent ID:** `main-agent`

**Endpoint:** `https://ee-openai-agent-production.up.railway.app/x-app/main-agent/chat`

**Configuration:**
```json
{
  "name": "Main Agent",
  "description": "Primary AI agent with file search capabilities",
  "folders": ["shared"],
  "model": "gpt-4o-mini"
}
```

---

## Authentication

All agent management endpoints require the Manager token:

```typescript
// Set in your .env.local
NEXT_PUBLIC_AUTH_TOKEN=your-manager-token-here
```

The `frontend-api-client.ts` automatically includes this in all requests.

---

## Complete Example: Agent Manager Component

```tsx
import { useState, useEffect } from 'react'
import { 
  listAgents, 
  createAgent, 
  updateAgent, 
  deleteAgent,
  chatWithAgent 
} from './lib/frontend-api-client'

export function AgentManager() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load agents on mount
  useEffect(() => {
    loadAgents()
  }, [])

  async function loadAgents() {
    try {
      setLoading(true)
      const data = await listAgents()
      setAgents(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAgent() {
    try {
      const agentId = prompt('Enter agent ID:')
      const name = prompt('Enter agent name:')
      
      if (!agentId || !name) return

      await createAgent(agentId, {
        name,
        description: 'New agent',
        folders: ['shared'],
        model: 'gpt-4o-mini'
      })

      await loadAgents() // Refresh list
      alert('Agent created!')
    } catch (err) {
      alert('Failed to create agent: ' + err.message)
    }
  }

  async function handleDeleteAgent(agentId) {
    if (!confirm(`Delete agent ${agentId}?`)) return

    try {
      await deleteAgent(agentId)
      await loadAgents() // Refresh list
      alert('Agent deleted!')
    } catch (err) {
      alert('Failed to delete agent: ' + err.message)
    }
  }

  async function handleUpdateFolders(agentId, currentFolders) {
    const newFolders = prompt(
      'Enter folders (comma-separated):',
      currentFolders?.join(', ')
    )
    
    if (!newFolders) return

    try {
      await updateAgent(agentId, {
        folders: newFolders.split(',').map(f => f.trim())
      })
      await loadAgents() // Refresh list
      alert('Agent updated!')
    } catch (err) {
      alert('Failed to update agent: ' + err.message)
    }
  }

  if (loading) {
    return <div className="loading">Loading agents...</div>
  }

  if (error) {
    return (
      <div className="error">
        <p>Error: {error}</p>
        <button onClick={loadAgents}>Retry</button>
      </div>
    )
  }

  return (
    <div className="agent-manager">
      <div className="header">
        <h1>Agent Manager</h1>
        <button onClick={handleCreateAgent}>+ Create Agent</button>
      </div>

      {agents.length === 0 ? (
        <div className="empty-state">
          <p>No agents found</p>
          <button onClick={handleCreateAgent}>Create First Agent</button>
        </div>
      ) : (
        <div className="agent-grid">
          {agents.map(agent => (
            <div key={agent.id} className="agent-card">
              <div className="agent-header">
                <h3>{agent.config?.name || agent.id}</h3>
                <button 
                  onClick={() => handleDeleteAgent(agent.id)}
                  className="delete-btn"
                >
                  🗑️
                </button>
              </div>

              <div className="agent-details">
                <p className="agent-id">ID: {agent.id}</p>
                <p className="agent-description">
                  {agent.config?.description || 'No description'}
                </p>
                
                <div className="agent-config">
                  <div className="config-item">
                    <strong>Model:</strong> {agent.config?.model || 'N/A'}
                  </div>
                  <div className="config-item">
                    <strong>Folders:</strong>{' '}
                    {agent.config?.folders?.join(', ') || 'None'}
                    <button 
                      onClick={() => handleUpdateFolders(
                        agent.id, 
                        agent.config?.folders
                      )}
                      className="edit-btn"
                    >
                      ✏️
                    </button>
                  </div>
                  <div className="config-item">
                    <strong>Created:</strong>{' '}
                    {new Date(agent.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="agent-actions">
                <button 
                  onClick={() => {
                    // Navigate to chat with this agent
                    window.location.href = `/chat/${agent.id}`
                  }}
                  className="primary-btn"
                >
                  Open Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Troubleshooting

### "No agents found" in Manager UI

**Possible causes:**

1. **Wrong authentication token**
   - Check that `NEXT_PUBLIC_AUTH_TOKEN` matches the backend's `MANAGER_TOKEN`
   - Verify the token is being sent in the Authorization header

2. **Server was restarted**
   - Agents are stored in memory (not database)
   - If the server restarts, agents are lost
   - Re-register agents using the registration script

3. **CORS issues**
   - Check browser console for CORS errors
   - Verify the backend allows requests from your frontend domain

4. **Wrong API URL**
   - Verify `NEXT_PUBLIC_API_BASE_URL` is set correctly
   - Should be: `https://ee-openai-agent-production.up.railway.app`

### Testing Authentication

```typescript
// Test if your token works
async function testAuth() {
  try {
    const agents = await listAgents()
    console.log('✅ Authentication works!', agents)
  } catch (error) {
    console.error('❌ Authentication failed:', error)
  }
}
```

### Checking Network Requests

Open browser DevTools → Network tab:

1. Look for request to `/manager/agents`
2. Check the Authorization header is present
3. Check the response status (should be 200)
4. If 401: Wrong token
5. If 404: Wrong URL
6. If CORS error: Backend CORS configuration issue

---

## API Endpoints

All endpoints require `Authorization: Bearer YOUR_MANAGER_TOKEN`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/manager/agents` | List all agents |
| POST | `/manager/agents` | Create new agent |
| GET | `/manager/agents/{id}` | Get agent details |
| PATCH | `/manager/agents/{id}` | Update agent |
| DELETE | `/manager/agents/{id}` | Delete agent |

**Base URL:** `https://ee-openai-agent-production.up.railway.app`

---

## Documentation

**Swagger UI:** https://ee-openai-agent-production.up.railway.app/docs

Look for the **"Manager - Agents"** section to test endpoints interactively.

---

## Next Steps

1. ✅ Copy `frontend-api-client.ts` to your frontend project
2. ✅ Set `NEXT_PUBLIC_AUTH_TOKEN` in your `.env.local`
3. ✅ Import and use `listAgents()` in your manager UI
4. ✅ Display agents in a list/grid
5. ✅ Add create/update/delete functionality
6. ✅ Test with the production agent `main-agent`

---

## Questions?

- Check the Swagger docs: https://ee-openai-agent-production.up.railway.app/docs
- Review `frontend-api-client.ts` for implementation details
- Test endpoints using the provided test scripts
- Contact backend team for MANAGER_TOKEN

