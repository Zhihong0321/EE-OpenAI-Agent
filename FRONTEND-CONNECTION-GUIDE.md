# 🔌 Frontend Connection Guide

## Quick Start

Your backend API is ready! Here's everything you need to connect.

---

## 🌐 API Base URL

**Production (Railway):**
```
https://ee-openai-agent-production.up.railway.app
```

**Local Development:**
```
http://localhost:3000
```

---

## 🔐 Authentication

### For `/x-app/{appId}/chat` and `/x-app/{appId}/invoke`

**Currently:** Any Bearer token works (format validation only)

```javascript
headers: {
  'Authorization': 'Bearer any-token-here'
}
```

### For `/manager/*` endpoints

**Currently:** No authentication required (MANAGER_TOKEN not set)

**When MANAGER_TOKEN is set in production:**
```javascript
headers: {
  'Authorization': 'Bearer YOUR_MANAGER_TOKEN'
}
```

> ⚠️ **Note:** We'll provide you with the MANAGER_TOKEN when we enable it for production.

---

## 🚀 Main Endpoints for Frontend

### 1. Chat with Agent

**Both endpoints work identically (use either one):**

```
POST /x-app/{appId}/chat
POST /x-app/{appId}/invoke
```

**Example Request:**
```javascript
const response = await fetch('https://ee-openai-agent-production.up.railway.app/x-app/my-agent/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer any-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: 'Hello, how can you help me?' }
    ],
    stream: false
  })
})

const data = await response.json()
console.log(data.choices[0].message.content)
```

**With File Search (RAG):**
```javascript
const response = await fetch('https://ee-openai-agent-production.up.railway.app/x-app/my-agent/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer any-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: 'What are the pricing plans?' }
    ],
    tools: [{ type: 'file_search' }],
    metadata: {
      agent_id: 'my-agent',
      file_query: 'pricing plans',
      top_k: 5,
      folders: ['shared', 'sales-team']
    }
  })
})
```

**Response Format:**
```json
{
  "id": "chatcmpl-123",
  "model": "gpt-4o-mini",
  "object": "chat.completion",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "I can help you with..."
    }
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

---

### 2. Upload Files (Browser)

```
POST /manager/files/upload-browser
```

**Example:**
```javascript
const formData = new FormData()
formData.append('file', fileInput.files[0])
formData.append('folder', 'sales-team')
formData.append('upsert', 'false')

const response = await fetch('https://ee-openai-agent-production.up.railway.app/manager/files/upload-browser', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer any-token'  // Will be required when MANAGER_TOKEN is set
  },
  body: formData
})

const result = await response.json()
// { bucket: "agent-files", key: "sales-team/document.pdf", folder: "sales-team" }
```

---

### 3. List Files

```
GET /manager/files?prefix=sales-team
```

**Example:**
```javascript
const response = await fetch('https://ee-openai-agent-production.up.railway.app/manager/files?prefix=sales-team', {
  headers: {
    'Authorization': 'Bearer any-token'
  }
})

const files = await response.json()
// [{ name: "document.pdf", id: "...", created_at: "..." }, ...]
```

---

### 4. Index File for Search

```
POST /manager/index
```

**Example:**
```javascript
const response = await fetch('https://ee-openai-agent-production.up.railway.app/manager/index', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer any-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    bucket: 'agent-files',
    file_key: 'sales-team/pricing.pdf',
    agent_id: 'my-agent',
    folder: 'sales-team',
    title: 'Pricing Guide'
  })
})

const result = await response.json()
// { documentId: "uuid", chunkCount: 15 }
```

---

### 5. Search Indexed Content

```
POST /manager/search
```

**Example:**
```javascript
const response = await fetch('https://ee-openai-agent-production.up.railway.app/manager/search', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer any-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agent_id: 'my-agent',
    query: 'What are the pricing plans?',
    top_k: 5,
    folders: ['shared', 'sales-team']
  })
})

const data = await response.json()
// { results: [{ content: "...", score: 0.95, ... }] }
```

---

## 📦 Complete React Example

```typescript
// api.ts
const API_BASE = 'https://ee-openai-agent-production.up.railway.app'
const AUTH_TOKEN = 'any-token' // Will be replaced with real token later

export async function chatWithAgent(
  agentId: string,
  message: string,
  useFileSearch: boolean = false
) {
  const body: any = {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: message }]
  }

  if (useFileSearch) {
    body.tools = [{ type: 'file_search' }]
    body.metadata = {
      agent_id: agentId,
      file_query: message,
      top_k: 5,
      folders: ['shared']
    }
  }

  const response = await fetch(`${API_BASE}/x-app/${agentId}/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Chat failed')
  }

  return response.json()
}

export async function uploadFile(file: File, folder: string = 'shared') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)

  const response = await fetch(`${API_BASE}/manager/files/upload-browser`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`
    },
    body: formData
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Upload failed')
  }

  return response.json()
}

export async function indexFile(
  fileKey: string,
  agentId: string,
  folder: string,
  title?: string
) {
  const response = await fetch(`${API_BASE}/manager/index`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      bucket: 'agent-files',
      file_key: fileKey,
      agent_id: agentId,
      folder,
      title
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Indexing failed')
  }

  return response.json()
}

// ChatComponent.tsx
import { useState } from 'react'
import { chatWithAgent } from './api'

export function ChatComponent() {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    setLoading(true)
    try {
      const result = await chatWithAgent('my-agent', message, true)
      setResponse(result.choices[0].message.content)
    } catch (error) {
      console.error('Chat error:', error)
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask a question..."
      />
      <button onClick={handleSend} disabled={loading}>
        {loading ? 'Sending...' : 'Send'}
      </button>
      {response && <div className="response">{response}</div>}
    </div>
  )
}
```

---

## 🔄 Streaming Support

For real-time responses:

```javascript
const response = await fetch('https://ee-openai-agent-production.up.railway.app/x-app/my-agent/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer any-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Tell me a story' }],
    stream: true
  })
})

const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  const chunk = decoder.decode(value)
  const lines = chunk.split('\n')
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6)
      if (data === '[DONE]') break
      
      const parsed = JSON.parse(data)
      const content = parsed.choices[0].delta.content
      if (content) {
        console.log(content) // Stream each word
      }
    }
  }
}
```

---

## 🐛 Error Handling

All errors follow this format:

```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "Missing required parameter",
    "code": "MISSING_PARAMETER",
    "run_id": "abc123"
  }
}
```

**Common Error Codes:**
- `UNAUTHENTICATED` - Missing/invalid Bearer token
- `MISSING_PARAMETER` - Required field missing
- `RATE_LIMITED` - Too many requests (60/min per agent)
- `NOT_FOUND` - Resource doesn't exist
- `MISSING_SCHEMA` - Database not set up

**Example Error Handler:**
```javascript
try {
  const result = await chatWithAgent('my-agent', 'Hello')
} catch (error) {
  if (error.message.includes('RATE_LIMITED')) {
    alert('Too many requests. Please wait a moment.')
  } else if (error.message.includes('UNAUTHENTICATED')) {
    alert('Authentication failed. Please check your token.')
  } else {
    alert('Something went wrong: ' + error.message)
  }
}
```

---

## 📚 Full API Documentation

**Interactive Swagger UI:**
```
https://ee-openai-agent-production.up.railway.app/docs
```

**OpenAPI Spec (for code generation):**
```
https://ee-openai-agent-production.up.railway.app/openapi.yaml
```

---

## 🧪 Testing

**Health Check:**
```bash
curl https://ee-openai-agent-production.up.railway.app/health
```

**Test Chat:**
```bash
curl -X POST https://ee-openai-agent-production.up.railway.app/x-app/test-agent/chat \
  -H "Authorization: Bearer any-token" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## 🔒 Security Notes

1. **Current State:** Authentication is minimal (format check only)
2. **Production:** We'll enable MANAGER_TOKEN and provide you with the token
3. **CORS:** Already enabled for all origins (`Access-Control-Allow-Origin: *`)
4. **Rate Limiting:** 60 requests per minute per agent
5. **HTTPS:** Enabled on Railway (production)

---

## 📞 Support

**Questions?**
- Check the Swagger docs: `/docs`
- Review the full workflow: `FRONTEND-MANAGER-WORKFLOW.md`
- Test endpoints in Swagger UI
- Contact backend team

---

## ✅ Quick Checklist

- [ ] Save API base URL in your environment variables
- [ ] Test `/health` endpoint
- [ ] Test `/x-app/{agentId}/chat` with a simple message
- [ ] Test file upload with `/manager/files/upload-browser`
- [ ] Test file search with RAG enabled
- [ ] Implement error handling for all API calls
- [ ] Add loading states for async operations
- [ ] Test streaming if needed

---

**Last Updated:** 2024
**Backend Version:** 1.0.0
**Production URL:** https://ee-openai-agent-production.up.railway.app
