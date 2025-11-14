# API Documentation

## 🚀 Quick Start

After deploying to Railway, your API documentation will be available at:

**Interactive Docs:** `https://your-app.railway.app/docs`

## 📖 What Your Frontend Team Gets

### 1. **Swagger UI** (`/docs`)
- Interactive API explorer
- "Try it out" feature to test endpoints directly
- Request/response examples
- Authentication testing
- Copy as cURL commands

### 2. **OpenAPI Spec** (`/openapi.yaml`)
- Download the full spec
- Generate TypeScript types
- Import into Postman/Insomnia
- Use with code generators

### 3. **Landing Page** (`/`)
- Quick overview
- Links to all documentation
- Health check endpoints

## 🔧 Local Testing

Start the server:
```bash
npm run start:api
```

Then visit:
- http://localhost:3000 - Landing page
- http://localhost:3000/docs - Interactive API docs
- http://localhost:3000/health - Health check

## 📝 Updating Documentation

Edit `openapi.yaml` to:
- Add new endpoints
- Update request/response schemas
- Add examples
- Document error codes

Changes are reflected immediately when you restart the server.

## 🎯 Frontend Integration Examples

### JavaScript/TypeScript
```javascript
// Search for relevant content
const response = await fetch('https://your-app.railway.app/manager/search', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agent_id: 'my-agent',
    query: 'How do I reset my password?',
    top_k: 5
  })
});

const data = await response.json();
console.log(data.results);
```

### Invoke Agent
```javascript
const response = await fetch('https://your-app.railway.app/x-app/my-agent/invoke', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      { role: 'user', content: 'What are the main features?' }
    ],
    tools: [{ type: 'file_search' }],
    metadata: {
      agent_id: 'my-agent',
      file_query: 'features',
      top_k: 5
    }
  })
});

const completion = await response.json();
console.log(completion.choices[0].message.content);
```

## 🔐 Authentication

Set the `MANAGER_TOKEN` environment variable in Railway:
```
MANAGER_TOKEN=your-secret-token-here
```

Frontend includes it in requests:
```javascript
headers: {
  'Authorization': 'Bearer your-secret-token-here'
}
```

## 📊 Available Endpoints

### Health & Diagnostics
- `GET /health` - Health check
- `GET /diagnostics` - System status
- `GET /schema` - SQL schema

### Manager - Agents
- `GET /manager/agents` - List agents
- `POST /manager/agents` - Create agent
- `GET /manager/agents/:id` - Get agent
- `PATCH /manager/agents/:id` - Update agent
- `DELETE /manager/agents/:id` - Delete agent

### Manager - Files
- `POST /manager/files/upload` - Upload file
- `GET /manager/files` - List files
- `DELETE /manager/files/:key` - Delete file
- `GET /manager/files/url` - Get signed URL

### Manager - Indexing
- `POST /manager/index` - Index file for search
- `POST /manager/search` - Vector search

### Wrapper
- `POST /x-app/:appId/deploy` - Deploy wrapper
- `POST /x-app/:appId/invoke` - Invoke agent
- `GET /x-app/:appId` - Get wrapper status

## 🎨 Generate TypeScript Types

Install generator:
```bash
npm install -D openapi-typescript
```

Generate types:
```bash
npx openapi-typescript openapi.yaml -o types/api.ts
```

Use in frontend:
```typescript
import type { paths } from './types/api';

type SearchRequest = paths['/manager/search']['post']['requestBody']['content']['application/json'];
type SearchResponse = paths['/manager/search']['post']['responses']['200']['content']['application/json'];
```

## 📦 Export for Postman

1. Visit `/openapi.yaml`
2. Copy the content
3. In Postman: Import → Raw text → Paste
4. Done! All endpoints ready to test

## 🔄 Streaming Support

The `/x-app/:appId/invoke` endpoint supports streaming:

```javascript
const response = await fetch('https://your-app.railway.app/x-app/my-agent/invoke', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello!' }],
    stream: true
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;
      const parsed = JSON.parse(data);
      console.log(parsed.choices[0].delta.content);
    }
  }
}
```

## 🐛 Error Handling

All errors follow OpenAI format:
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

Common error codes:
- `UNAUTHENTICATED` - Missing/invalid auth token
- `MISSING_PARAMETER` - Required field missing
- `MISSING_SCHEMA` - Database tables not set up
- `RATE_LIMITED` - Too many requests
- `NOT_FOUND` - Resource doesn't exist

## 🚀 Railway Deployment

1. Push your code to GitHub
2. Connect to Railway
3. Set environment variables:
   - `THIRD_PARTY_BASE_URL`
   - `THIRD_PARTY_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `SUPABASE_BUCKET`
   - `MANAGER_TOKEN` (optional, for auth)
4. Deploy!

Your docs will be live at: `https://your-app.railway.app/docs`
