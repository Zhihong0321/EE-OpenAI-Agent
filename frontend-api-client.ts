/**
 * Ready-to-use API Client for Frontend
 * 
 * Copy this file to your frontend project (e.g., src/lib/api.ts)
 * 
 * Usage:
 *   import { chatWithAgent, uploadFile, indexFile } from './lib/api'
 */

// Configuration
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ee-openai-agent-production.up.railway.app'
const AUTH_TOKEN = process.env.NEXT_PUBLIC_AUTH_TOKEN || 'any-token'

// Types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  model?: string
  messages: ChatMessage[]
  tools?: Array<{ type: 'file_search' }>
  stream?: boolean
  metadata?: {
    agent_id?: string
    file_query?: string
    top_k?: number
    folders?: string[]
  }
}

export interface ChatResponse {
  id: string
  model: string
  object: string
  choices: Array<{
    index: number
    message: ChatMessage
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface UploadResponse {
  bucket: string
  key: string
  folder: string
}

export interface IndexResponse {
  documentId: string
  chunkCount: number
}

export interface SearchResult {
  chunk_id: string
  content: string
  chunk_index: number
  score: number
  folder: string
  document: {
    id: string
    title: string
    bucket: string
    file_key: string
  }
}

export interface SearchResponse {
  agent_id: string
  query: string
  top_k: number
  folders: string[]
  results: SearchResult[]
}

export interface ApiError {
  error: {
    type: string
    message: string
    code: string
    run_id?: string
  }
}

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error: ApiError = await response.json()
    throw new Error(error.error?.message || `API Error: ${response.status}`)
  }

  return response.json()
}

/**
 * Chat with an agent
 * 
 * @param agentId - The agent ID
 * @param messages - Array of chat messages
 * @param options - Optional configuration
 * @returns Chat completion response
 * 
 * @example
 * const response = await chatWithAgent('my-agent', [
 *   { role: 'user', content: 'Hello!' }
 * ])
 * console.log(response.choices[0].message.content)
 */
export async function chatWithAgent(
  agentId: string,
  messages: ChatMessage[],
  options?: {
    model?: string
    useFileSearch?: boolean
    fileQuery?: string
    topK?: number
    folders?: string[]
  }
): Promise<ChatResponse> {
  const body: ChatRequest = {
    model: options?.model || 'gpt-4o-mini',
    messages,
  }

  if (options?.useFileSearch) {
    body.tools = [{ type: 'file_search' }]
    body.metadata = {
      agent_id: agentId,
      file_query: options.fileQuery || messages[messages.length - 1].content,
      top_k: options.topK || 5,
      folders: options.folders || ['shared'],
    }
  }

  return apiCall<ChatResponse>(`/x-app/${agentId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/**
 * Chat with streaming response
 * 
 * @param agentId - The agent ID
 * @param messages - Array of chat messages
 * @param onChunk - Callback for each chunk of text
 * @param options - Optional configuration
 * 
 * @example
 * await chatWithAgentStream('my-agent', [
 *   { role: 'user', content: 'Tell me a story' }
 * ], (text) => {
 *   console.log(text) // Each word as it arrives
 * })
 */
export async function chatWithAgentStream(
  agentId: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  options?: {
    model?: string
    useFileSearch?: boolean
    fileQuery?: string
    topK?: number
    folders?: string[]
  }
): Promise<void> {
  const body: ChatRequest = {
    model: options?.model || 'gpt-4o-mini',
    messages,
    stream: true,
  }

  if (options?.useFileSearch) {
    body.tools = [{ type: 'file_search' }]
    body.metadata = {
      agent_id: agentId,
      file_query: options.fileQuery || messages[messages.length - 1].content,
      top_k: options.topK || 5,
      folders: options.folders || ['shared'],
    }
  }

  const response = await fetch(`${API_BASE}/x-app/${agentId}/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error: ApiError = await response.json()
    throw new Error(error.error?.message || 'Stream failed')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') return

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) onChunk(content)
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}

/**
 * Upload a file from browser
 * 
 * @param file - The file to upload
 * @param folder - Destination folder (default: 'shared')
 * @param upsert - Overwrite if exists (default: false)
 * @returns Upload response with file key
 * 
 * @example
 * const result = await uploadFile(fileInput.files[0], 'sales-team')
 * console.log('Uploaded:', result.key)
 */
export async function uploadFile(
  file: File,
  folder: string = 'shared',
  upsert: boolean = false
): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)
  formData.append('upsert', String(upsert))

  return apiCall<UploadResponse>('/manager/files/upload-browser', {
    method: 'POST',
    body: formData,
  })
}

/**
 * List files in storage
 * 
 * @param prefix - Filter by path prefix (e.g., 'sales-team/')
 * @returns Array of file metadata
 * 
 * @example
 * const files = await listFiles('sales-team/')
 */
export async function listFiles(prefix?: string): Promise<any[]> {
  const params = prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''
  return apiCall<any[]>(`/manager/files${params}`, {
    method: 'GET',
  })
}

/**
 * Delete a file
 * 
 * @param fileKey - The file key/path to delete
 * @returns Deletion confirmation
 * 
 * @example
 * await deleteFile('sales-team/old-doc.pdf')
 */
export async function deleteFile(fileKey: string): Promise<{ deleted: boolean }> {
  return apiCall<{ deleted: boolean }>(`/manager/files/${encodeURIComponent(fileKey)}`, {
    method: 'DELETE',
  })
}

/**
 * Index a file for vector search
 * 
 * @param fileKey - The file key in storage
 * @param agentId - The agent ID
 * @param folder - The folder name
 * @param title - Optional document title
 * @returns Indexing result
 * 
 * @example
 * const result = await indexFile('sales-team/pricing.pdf', 'my-agent', 'sales-team', 'Pricing Guide')
 * console.log(`Indexed ${result.chunkCount} chunks`)
 */
export async function indexFile(
  fileKey: string,
  agentId: string,
  folder: string,
  title?: string
): Promise<IndexResponse> {
  return apiCall<IndexResponse>('/manager/index', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bucket: 'agent-files',
      file_key: fileKey,
      agent_id: agentId,
      folder,
      title,
    }),
  })
}

/**
 * Search indexed content
 * 
 * @param agentId - The agent ID
 * @param query - Search query
 * @param options - Optional configuration
 * @returns Search results
 * 
 * @example
 * const results = await searchFiles('my-agent', 'pricing plans', {
 *   topK: 5,
 *   folders: ['shared', 'sales-team']
 * })
 */
export async function searchFiles(
  agentId: string,
  query: string,
  options?: {
    topK?: number
    folders?: string[]
  }
): Promise<SearchResponse> {
  return apiCall<SearchResponse>('/manager/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_id: agentId,
      query,
      top_k: options?.topK || 5,
      folders: options?.folders || ['shared'],
    }),
  })
}

/**
 * Upload and index a file in one step
 * 
 * @param file - The file to upload
 * @param agentId - The agent ID
 * @param folder - Destination folder
 * @param title - Optional document title
 * @returns Combined upload and index result
 * 
 * @example
 * const result = await uploadAndIndexFile(
 *   fileInput.files[0],
 *   'my-agent',
 *   'sales-team',
 *   'Q4 Pricing'
 * )
 */
export async function uploadAndIndexFile(
  file: File,
  agentId: string,
  folder: string = 'shared',
  title?: string
): Promise<{ upload: UploadResponse; index: IndexResponse }> {
  const upload = await uploadFile(file, folder)
  const index = await indexFile(upload.key, agentId, folder, title || file.name)
  return { upload, index }
}

/**
 * List all registered agents
 * 
 * @returns Array of agents
 * 
 * @example
 * const agents = await listAgents()
 * agents.forEach(agent => console.log(agent.id, agent.config?.name))
 */
export async function listAgents(): Promise<Array<{
  id: string
  config?: {
    name?: string
    description?: string
    folders?: string[]
    model?: string
  }
  created_at: string
}>> {
  return apiCall<Array<any>>('/manager/agents', {
    method: 'GET',
  })
}

/**
 * Get a specific agent by ID
 * 
 * @param agentId - The agent ID
 * @returns Agent details
 * 
 * @example
 * const agent = await getAgent('main-agent')
 */
export async function getAgent(agentId: string): Promise<{
  id: string
  config?: any
  created_at: string
}> {
  return apiCall<any>(`/manager/agents/${agentId}`, {
    method: 'GET',
  })
}

/**
 * Create a new agent
 * 
 * @param agentId - The agent ID
 * @param config - Agent configuration
 * @returns Created agent
 * 
 * @example
 * const agent = await createAgent('my-agent', {
 *   name: 'My Agent',
 *   folders: ['shared', 'team']
 * })
 */
export async function createAgent(
  agentId: string,
  config?: {
    name?: string
    description?: string
    folders?: string[]
    model?: string
  }
): Promise<{
  id: string
  config?: any
  created_at: string
}> {
  return apiCall<any>('/manager/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: agentId, config }),
  })
}

/**
 * Update an existing agent
 * 
 * @param agentId - The agent ID
 * @param config - Updated configuration
 * @returns Updated agent
 * 
 * @example
 * const agent = await updateAgent('my-agent', {
 *   folders: ['shared', 'sales-team']
 * })
 */
export async function updateAgent(
  agentId: string,
  config: any
): Promise<{
  id: string
  config?: any
  created_at: string
}> {
  return apiCall<any>(`/manager/agents/${agentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  })
}

/**
 * Delete an agent
 * 
 * @param agentId - The agent ID
 * @returns Deletion result
 * 
 * @example
 * await deleteAgent('old-agent')
 */
export async function deleteAgent(agentId: string): Promise<{ deleted: boolean }> {
  return apiCall<{ deleted: boolean }>(`/manager/agents/${agentId}`, {
    method: 'DELETE',
  })
}

/**
 * Health check
 * 
 * @returns Health status
 */
export async function healthCheck(): Promise<{ status: string; run_id: string }> {
  return apiCall<{ status: string; run_id: string }>('/health', {
    method: 'GET',
  })
}
