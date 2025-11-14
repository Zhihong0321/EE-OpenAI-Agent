# 🚨 IMPORTANT UPDATE: Backend API Changes

## Summary

**DO NOT use Supabase credentials in the frontend.** All file operations must go through the backend API.

We've added a new browser-compatible file upload endpoint. Please update your implementation to use ONLY the backend API endpoints.

---

## What Changed?

### ❌ OLD (INCORRECT) Approach
```javascript
// DON'T DO THIS - No direct Supabase connection from frontend!
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
await supabase.storage.from('agent-files').upload(path, file)
```

### ✅ NEW (CORRECT) Approach
```javascript
// DO THIS - Use backend API endpoint
const formData = new FormData()
formData.append('file', file)
formData.append('folder', 'sales-team')

await fetch('https://ee-openai-agent-production.up.railway.app/manager/files/upload-browser', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_MANAGER_TOKEN'
  },
  body: formData
})
```

---

## New Endpoint: File Upload for Browsers

### Endpoint
```
POST /manager/files/upload-browser
```

### Authentication
```
Authorization: Bearer YOUR_MANAGER_TOKEN
```

### Content-Type
```
multipart/form-data
```

### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The file to upload |
| `folder` | string | No | Destination folder (default: "shared") |
| `bucket` | string | No | Storage bucket (default: from env) |
| `upsert` | boolean | No | Overwrite if exists (default: false) |

### Response
```json
{
  "bucket": "agent-files",
  "key": "sales-team/pricing.pdf",
  "folder": "sales-team"
}
```

---

## Complete Implementation Example

### React/Next.js Example

```typescript
import { useState } from 'react'

interface UploadResponse {
  bucket: string
  key: string
  folder: string
}

export function FileUploader() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(file: File, folder: string) {
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)
      formData.append('upsert', 'false')

      const response = await fetch(
        'https://ee-openai-agent-production.up.railway.app/manager/files/upload-browser',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_MANAGER_TOKEN}`
          },
          body: formData
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Upload failed')
      }

      const result: UploadResponse = await response.json()
      console.log('File uploaded:', result.key)
      
      // Optionally trigger indexing
      await indexFile(result.key, folder)
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      throw err
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file, 'shared')
        }}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
```

### Vanilla JavaScript Example

```javascript
async function uploadFile(fileInput, folder = 'shared') {
  const file = fileInput.files[0]
  if (!file) {
    alert('Please select a file')
    return
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)
  formData.append('upsert', 'false')

  try {
    const response = await fetch(
      'https://ee-openai-agent-production.up.railway.app/manager/files/upload-browser',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer YOUR_MANAGER_TOKEN'
        },
        body: formData
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Upload failed')
    }

    const result = await response.json()
    console.log('Upload successful:', result)
    alert(`File uploaded: ${result.key}`)
    
    return result
  } catch (error) {
    console.error('Upload error:', error)
    alert('Upload failed: ' + error.message)
  }
}

// Usage
document.getElementById('uploadBtn').addEventListener('click', () => {
  const fileInput = document.getElementById('fileInput')
  const folder = document.getElementById('folderSelect').value
  uploadFile(fileInput, folder)
})
```

### Vue.js Example

```vue
<template>
  <div>
    <input 
      type="file" 
      @change="handleFileChange"
      :disabled="uploading"
    />
    <select v-model="selectedFolder">
      <option value="shared">Shared</option>
      <option value="sales-team">Sales Team</option>
      <option value="support-team">Support Team</option>
    </select>
    <button @click="uploadFile" :disabled="!file || uploading">
      {{ uploading ? 'Uploading...' : 'Upload' }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const file = ref(null)
const selectedFolder = ref('shared')
const uploading = ref(false)
const error = ref(null)

function handleFileChange(event) {
  file.value = event.target.files[0]
  error.value = null
}

async function uploadFile() {
  if (!file.value) return

  uploading.value = true
  error.value = null

  const formData = new FormData()
  formData.append('file', file.value)
  formData.append('folder', selectedFolder.value)

  try {
    const response = await fetch(
      'https://ee-openai-agent-production.up.railway.app/manager/files/upload-browser',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_MANAGER_TOKEN}`
        },
        body: formData
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Upload failed')
    }

    const result = await response.json()
    console.log('Upload successful:', result)
    
    // Reset form
    file.value = null
    
  } catch (err) {
    error.value = err.message
  } finally {
    uploading.value = false
  }
}
</script>
```

---

## Why This Change?

### Security
- ❌ Exposing Supabase credentials in frontend is a security risk
- ✅ Backend API keeps credentials secure server-side
- ✅ Single authentication point (MANAGER_TOKEN)

### Control
- ❌ Direct Supabase access bypasses backend logic
- ✅ Backend can validate, transform, and log all operations
- ✅ Easier to add rate limiting, virus scanning, etc.

### Maintenance
- ❌ Frontend needs Supabase SDK and configuration
- ✅ Frontend only needs standard fetch API
- ✅ Backend changes don't require frontend updates

---

## Migration Checklist

- [ ] Remove `@supabase/supabase-js` from frontend dependencies
- [ ] Remove all Supabase credential environment variables from frontend
- [ ] Update file upload code to use `/manager/files/upload-browser`
- [ ] Update file list code to use `/manager/files` (already correct)
- [ ] Update file delete code to use `/manager/files/{key}` (already correct)
- [ ] Update file download code to use `/manager/files/url` (already correct)
- [ ] Test file upload with different folders
- [ ] Test error handling (large files, invalid formats, etc.)
- [ ] Update documentation/comments in your code

---

## All Manager API Endpoints

**You should ONLY use these endpoints. Never connect directly to Supabase.**

### Health & Diagnostics
- `GET /health` - Health check
- `GET /diagnostics` - System status

### Agents
- `GET /manager/agents` - List all agents
- `POST /manager/agents` - Create agent
- `GET /manager/agents/{id}` - Get agent details
- `PATCH /manager/agents/{id}` - Update agent
- `DELETE /manager/agents/{id}` - Delete agent

### Files
- `POST /manager/files/upload-browser` - **NEW: Upload file from browser**
- `GET /manager/files` - List files
- `DELETE /manager/files/{key}` - Delete file
- `GET /manager/files/url` - Get signed download URL

### Indexing & Search
- `POST /manager/index` - Index file for vector search
- `POST /manager/search` - Search indexed content

### Agent Invocation
- `POST /x-app/{agentId}/invoke` - Invoke agent with messages
- `POST /x-app/{agentId}/chat` - Chat with agent (alias for /invoke)

---

## Authentication

All Manager endpoints require Bearer token:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_MANAGER_TOKEN'
}
```

**Where to get the token:**
- Ask your backend team for the MANAGER_TOKEN
- Store it in environment variables (`.env.local`)
- Never commit it to git
- Never expose it in client-side code (use server-side API routes if needed)

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "File too large",
    "code": "FILE_TOO_LARGE",
    "run_id": "abc123"
  }
}
```

**Common error codes:**
- `UNAUTHENTICATED` - Missing or invalid Bearer token
- `MISSING_FILE` - No file provided in upload
- `INVALID_CONTENT_TYPE` - Wrong Content-Type header
- `MISSING_BUCKET` - Bucket not specified
- `RATE_LIMITED` - Too many requests

---

## Testing

### Test the new endpoint:

```bash
curl -X POST \
  https://ee-openai-agent-production.up.railway.app/manager/files/upload-browser \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -F "file=@./test.pdf" \
  -F "folder=test-folder" \
  -F "upsert=false"
```

Expected response:
```json
{
  "bucket": "agent-files",
  "key": "test-folder/test.pdf",
  "folder": "test-folder"
}
```

---

## Questions?

If you have any questions about this update:

1. Check the full workflow guide: `FRONTEND-MANAGER-WORKFLOW.md`
2. Check the API documentation: https://ee-openai-agent-production.up.railway.app/docs
3. Test endpoints using the Swagger UI
4. Contact the backend team

---

## Summary

**DO:**
✅ Use `/manager/files/upload-browser` for file uploads  
✅ Use `multipart/form-data` with FormData  
✅ Include Bearer token in Authorization header  
✅ Use all other `/manager/*` endpoints for operations  

**DON'T:**
❌ Import `@supabase/supabase-js` in frontend  
❌ Use Supabase credentials in frontend  
❌ Connect directly to Supabase Storage  
❌ Bypass the backend API  

---

**This update is live now at:**
https://ee-openai-agent-production.up.railway.app

**API Documentation:**
https://ee-openai-agent-production.up.railway.app/docs
