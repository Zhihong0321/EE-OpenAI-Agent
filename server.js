import 'dotenv/config'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { URL } from 'node:url'
import { fileURLToPath } from 'node:url'
import swaggerUi from 'swagger-ui-express'
import yaml from 'yamljs'
import { getProviderClient } from './services/provider.js'
import { ensureBucket, uploadFile, listFiles, deleteFile as supabaseDelete, getSignedUrl } from './supabase-files.js'
import { indexSupabaseFile, searchSupabase } from './supabase-vector.js'
import { requireRuntimeEnv } from './config/env.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const swaggerDocument = yaml.load(path.join(__dirname, 'openapi.yaml'))

const rateLimits = new Map()
const isRateLimited = (key, limit = 60, windowMs = 60_000) => {
  const now = Date.now()
  const entry = rateLimits.get(key) || { count: 0, resetAt: now + windowMs }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs }
  entry.count += 1
  rateLimits.set(key, entry)
  return entry.count > limit
}

const json = (res, status, payload) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

const readJson = async (req) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = Buffer.concat(chunks).toString('utf8')
  if (!body) return {}
  try { return JSON.parse(body) } catch { return {} }
}

const requireAuth = (req) => {
  const auth = req.headers['authorization'] || ''
  if (!auth.startsWith('Bearer ')) return false
  return true
}

const requireManagerAuth = (req) => {
  const token = process.env.MANAGER_TOKEN
  if (!token) return true
  const auth = req.headers['authorization'] || ''
  if (!auth.startsWith('Bearer ')) return false
  const received = auth.replace('Bearer ', '').trim()
  return received === token
}

const server = http.createServer(async (req, res) => {
  try {
    requireRuntimeEnv()
    const url = new URL(req.url, `http://${req.headers.host}`)
    const runId = Date.now().toString(36)

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end() }

    if (url.pathname === '/' && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html')
      return res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>OpenAI Agent Wrapper API</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    h1 { color: #333; }
    .card { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .btn { display: inline-block; background: #0066cc; color: white; padding: 10px 20px; border-radius: 5px; margin: 10px 10px 10px 0; }
    .btn:hover { background: #0052a3; text-decoration: none; }
  </style>
</head>
<body>
  <h1>🤖 OpenAI Agent Wrapper API</h1>
  <p>Hybrid AI agent system with Supabase vector search and 3rd party provider integration.</p>
  
  <div class="card">
    <h2>📚 API Documentation</h2>
    <a href="/docs" class="btn">Interactive API Docs (Swagger UI)</a>
    <a href="/openapi.yaml" class="btn">Download OpenAPI Spec</a>
  </div>
  
  <div class="card">
    <h2>🔍 Quick Links</h2>
    <ul>
      <li><a href="/health">Health Check</a></li>
      <li><a href="/diagnostics">System Diagnostics</a></li>
      <li><a href="/schema">SQL Schema</a></li>
    </ul>
  </div>
  
  <div class="card">
    <h2>🚀 Endpoints</h2>
    <ul>
      <li><strong>Manager - Agents:</strong> /manager/agents</li>
      <li><strong>Manager - Files:</strong> /manager/files/*</li>
      <li><strong>Manager - Indexing:</strong> /manager/index, /manager/search</li>
      <li><strong>Wrapper:</strong> /x-app/:appId/*</li>
    </ul>
  </div>
</body>
</html>
      `)
    }

    if (url.pathname === '/openapi.yaml' && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/yaml')
      const yamlContent = fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8')
      return res.end(yamlContent)
    }

    if (url.pathname.startsWith('/docs')) {
      if (url.pathname === '/docs' || url.pathname === '/docs/') {
        const html = swaggerUi.generateHTML(swaggerDocument, {
          customCss: '.swagger-ui .topbar { display: none }',
          customSiteTitle: 'OpenAI Agent Wrapper API Docs'
        })
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html')
        return res.end(html)
      }
      
      if (url.pathname === '/docs/swagger-ui.css') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/css')
        return res.end(swaggerUi.swaggerInit)
      }
      
      const swaggerAssets = swaggerUi.serveFiles(swaggerDocument)
      const asset = swaggerAssets[url.pathname.replace('/docs/', '')]
      if (asset) {
        res.statusCode = 200
        return res.end(asset)
      }
    }

    if (url.pathname === '/health') {
      return json(res, 200, { status: 'ok', run_id: runId })
    }

    if (url.pathname === '/schema' && req.method === 'GET') {
      try {
        const file = path.join(process.cwd(), 'scripts', 'schema.sql')
        const sql = fs.readFileSync(file, 'utf8')
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/plain')
        return res.end(sql)
      } catch (e) {
        return json(res, 500, { error: { type: 'internal_error', message: e.message, code: 'SCHEMA_READ_FAILED', run_id: runId } })
      }
    }

    if (url.pathname === '/diagnostics' && req.method === 'GET') {
      const supabaseUrl = !!process.env.SUPABASE_URL
      const hasPublishable = !!(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY)
      const hasService = !!(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
      const providerUrl = !!process.env.THIRD_PARTY_BASE_URL
      const providerKey = !!process.env.THIRD_PARTY_API_KEY
      let storageOk = false
      let storageError = null
      let schemaOk = false
      let schemaError = null
      let tables = { documents: false, chunks: false, chunk_embeddings: false }
      let rpcOk = false
      let rpcError = null
      try {
        const bucket = process.env.SUPABASE_BUCKET || 'agent-files'
        await ensureBucket(bucket)
        storageOk = true
      } catch (e) {
        storageError = e.message
      }
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
        if (process.env.SUPABASE_URL && key) {
          const client = createClient(process.env.SUPABASE_URL, key)
          const { error: dErr } = await client.from('documents').select('id').limit(1)
          const { error: cErr } = await client.from('chunks').select('id').limit(1)
          const { error: eErr } = await client.from('chunk_embeddings').select('chunk_id').limit(1)
          tables.documents = !dErr
          tables.chunks = !cErr
          tables.chunk_embeddings = !eErr
          schemaOk = tables.documents && tables.chunks && tables.chunk_embeddings
          if (!schemaOk) schemaError = [dErr?.message, cErr?.message, eErr?.message].filter(Boolean)[0] || null
          try {
            const zeros = Array(1536).fill(0)
            const { error: rErr } = await client.rpc('match_chunks', { query_embedding: zeros, match_count: 1, agent_id: 'default' })
            rpcOk = !rErr
            rpcError = rErr?.message || null
          } catch (e) {
            rpcError = e.message
          }
        }
      } catch (e) {
        schemaError = e.message
      }
      return json(res, 200, { supabaseUrl, hasPublishable, hasService, providerUrl, providerKey, storageOk, storageError, schemaOk, schemaError, tables, rpcOk, rpcError })
    }

    if (url.pathname.startsWith('/manager/agents')) {
      if (!requireManagerAuth(req)) return json(res, 401, { error: { type: 'authentication_error', message: 'Unauthorized', code: 'UNAUTHENTICATED' } })
      globalThis.__agents = globalThis.__agents || new Map()
      const idMatch = url.pathname.match(/^\/manager\/agents\/(.+)$/)
      if (req.method === 'GET' && url.pathname === '/manager/agents') {
        const list = Array.from(globalThis.__agents.values())
        return json(res, 200, list)
      }
      if (req.method === 'POST' && url.pathname === '/manager/agents') {
        const body = await readJson(req)
        const id = body.id || crypto.randomUUID()
        const record = { id, config: body.config || {}, created_at: new Date().toISOString() }
        globalThis.__agents.set(id, record)
        return json(res, 201, record)
      }
      if (idMatch) {
        const id = idMatch[1]
        if (req.method === 'GET') {
          const found = globalThis.__agents.get(id)
          if (!found) return json(res, 404, { error: { type: 'not_found', message: 'Agent not found', code: 'AGENT_NOT_FOUND', run_id: runId } })
          return json(res, 200, found)
        }
        if (req.method === 'PATCH') {
          const body = await readJson(req)
          const existing = globalThis.__agents.get(id) || { id }
          const updated = { ...existing, config: { ...existing.config, ...body.config } }
          globalThis.__agents.set(id, updated)
          return json(res, 200, updated)
        }
        if (req.method === 'DELETE') {
          const ok = globalThis.__agents.delete(id)
          return json(res, 200, { deleted: ok })
        }
      }
    }

    if (url.pathname === '/manager/files/upload' && req.method === 'POST') {
      if (!requireManagerAuth(req)) return json(res, 401, { error: { type: 'authentication_error', message: 'Unauthorized', code: 'UNAUTHENTICATED' } })
      const body = await readJson(req)
      const bucket = body.bucket || process.env.SUPABASE_BUCKET
      if (!bucket) return json(res, 400, { error: { type: 'invalid_request_error', message: 'bucket required', code: 'MISSING_BUCKET', run_id: runId } })
      await ensureBucket(bucket)
      const data = await uploadFile(bucket, body.file_path, body.dest_path, { upsert: !!body.upsert })
      return json(res, 201, { bucket, key: data.path })
    }
    if (url.pathname === '/manager/files/upload-browser' && req.method === 'POST') {
      if (!requireManagerAuth(req)) return json(res, 401, { error: { type: 'authentication_error', message: 'Unauthorized', code: 'UNAUTHENTICATED' } })
      const contentType = req.headers['content-type'] || ''
      if (!contentType.includes('multipart/form-data')) {
        return json(res, 400, { error: { type: 'invalid_request_error', message: 'Content-Type must be multipart/form-data', code: 'INVALID_CONTENT_TYPE', run_id: runId } })
      }
      const boundary = contentType.split('boundary=')[1]
      if (!boundary) return json(res, 400, { error: { type: 'invalid_request_error', message: 'Missing boundary', code: 'MISSING_BOUNDARY', run_id: runId } })
      
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)
      const parts = buffer.toString('binary').split('--' + boundary)
      
      let fileBuffer = null
      let fileName = null
      let folder = 'shared'
      let bucket = process.env.SUPABASE_BUCKET
      let upsert = false
      
      for (const part of parts) {
        if (part.includes('Content-Disposition')) {
          const nameMatch = part.match(/name="([^"]+)"/)
          const filenameMatch = part.match(/filename="([^"]+)"/)
          const contentStart = part.indexOf('\r\n\r\n') + 4
          const contentEnd = part.lastIndexOf('\r\n')
          const content = part.substring(contentStart, contentEnd)
          
          if (filenameMatch) {
            fileName = filenameMatch[1]
            fileBuffer = Buffer.from(content, 'binary')
          } else if (nameMatch) {
            const fieldName = nameMatch[1]
            if (fieldName === 'folder') folder = content.trim()
            if (fieldName === 'bucket') bucket = content.trim()
            if (fieldName === 'upsert') upsert = content.trim() === 'true'
          }
        }
      }
      
      if (!fileBuffer || !fileName) {
        return json(res, 400, { error: { type: 'invalid_request_error', message: 'No file provided', code: 'MISSING_FILE', run_id: runId } })
      }
      
      await ensureBucket(bucket)
      const destPath = folder && folder !== 'shared' ? `${folder}/${fileName}` : fileName
      
      const { createClient } = await import('@supabase/supabase-js')
      const publishable = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
      const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || publishable
      const supabase = createClient(process.env.SUPABASE_URL, secret)
      
      const { data, error } = await supabase.storage.from(bucket).upload(destPath, fileBuffer, { 
        upsert,
        contentType: 'application/octet-stream'
      })
      
      if (error) throw error
      return json(res, 201, { bucket, key: data.path, folder })
    }
    if (url.pathname === '/manager/files' && req.method === 'GET') {
      if (!requireManagerAuth(req)) return json(res, 401, { error: { type: 'authentication_error', message: 'Unauthorized', code: 'UNAUTHENTICATED' } })
      const bucket = url.searchParams.get('bucket') || process.env.SUPABASE_BUCKET
      const prefix = url.searchParams.get('prefix') || ''
      const files = await listFiles(bucket, prefix)
      return json(res, 200, files)
    }
    if (url.pathname.startsWith('/manager/files/') && req.method === 'DELETE') {
      if (!requireManagerAuth(req)) return json(res, 401, { error: { type: 'authentication_error', message: 'Unauthorized', code: 'UNAUTHENTICATED' } })
      const bucket = url.searchParams.get('bucket') || process.env.SUPABASE_BUCKET
      const key = decodeURIComponent(url.pathname.replace('/manager/files/', ''))
      await supabaseDelete(bucket, key)
      return json(res, 200, { deleted: true })
    }
    if (url.pathname === '/manager/files/url' && req.method === 'GET') {
      if (!requireManagerAuth(req)) return json(res, 401, { error: { type: 'authentication_error', message: 'Unauthorized', code: 'UNAUTHENTICATED' } })
      const bucket = url.searchParams.get('bucket') || process.env.SUPABASE_BUCKET
      const key = url.searchParams.get('key')
      const data = await getSignedUrl(bucket, key, 3600)
      return json(res, 200, data)
    }

    if (url.pathname === '/manager/index' && req.method === 'POST') {
      if (!requireManagerAuth(req)) return json(res, 401, { error: { type: 'authentication_error', message: 'Unauthorized', code: 'UNAUTHENTICATED' } })
      const body = await readJson(req)
      const bucket = body.bucket || process.env.SUPABASE_BUCKET
      const fileKey = body.file_key
      const agentId = body.agent_id || process.env.AGENT_ID || 'default'
      const folder = body.folder
      if (!bucket) return json(res, 400, { error: { type: 'invalid_request_error', message: 'bucket required', code: 'MISSING_BUCKET', run_id: runId } })
      if (!fileKey) return json(res, 400, { error: { type: 'invalid_request_error', message: 'file_key required', code: 'MISSING_FILE_KEY', run_id: runId } })
      try {
        const result = await indexSupabaseFile({ bucket, fileKey, agentId, title: body.title, folder, chunkOptions: body.chunk_options, embeddingModel: body.embedding_model })
        return json(res, 200, result)
      } catch (e) {
        const msg = e.message || ''
        const code = msg.includes('Could not find the table') ? 'MISSING_SCHEMA' : (msg.startsWith('EMBED_DIM_MISMATCH') ? 'EMBED_DIM_MISMATCH' : (msg.includes('Object not found') ? 'OBJECT_NOT_FOUND' : 'INDEX_FAILED'))
        const status = code === 'MISSING_SCHEMA' ? 400 : 500
        return json(res, status, { error: { type: 'invalid_request_error', message: msg || 'Indexing failed', code, run_id: runId, details: e.details || null } })
      }
    }

    if (url.pathname === '/manager/search' && req.method === 'POST') {
      if (!requireManagerAuth(req)) return json(res, 401, { error: { type: 'authentication_error', message: 'Unauthorized', code: 'UNAUTHENTICATED' } })
      const body = await readJson(req)
      const agentId = body.agent_id || process.env.AGENT_ID || 'default'
      const query = body.query
      const topK = body.top_k || 5
      const folders = body.folders || ['shared']
      if (!query || !query.trim()) return json(res, 400, { error: { type: 'invalid_request_error', message: 'query required', code: 'MISSING_QUERY', run_id: runId } })
      try {
        const results = await searchSupabase({ agentId, query, topK, folders, embeddingModel: body.embedding_model })
        return json(res, 200, { agent_id: agentId, query, top_k: topK, folders, results })
      } catch (e) {
        const msg = e.message || ''
        const code = msg.includes('Could not find the table') ? 'MISSING_SCHEMA' : 'SEARCH_FAILED'
        const status = code === 'MISSING_SCHEMA' ? 400 : 500
        return json(res, status, { error: { type: 'invalid_request_error', message: msg || 'Search failed', code, run_id: runId } })
      }
    }

    if (url.pathname.match(/^\/x-app\/[^/]+\/invoke$/) && req.method === 'POST') {
      if (!requireAuth(req)) return json(res, 401, { error: { type: 'authentication_error', message: 'Missing or invalid Authorization header', code: 'UNAUTHENTICATED', run_id: runId } })
      const body = await readJson(req)
      const appId = url.pathname.split('/')[2]
      if (isRateLimited(`invoke:${appId}`)) return json(res, 429, { error: { type: 'rate_limit_exceeded', message: 'Too many requests', code: 'RATE_LIMITED', run_id: runId } })
      const llm = await getProviderClient()
      const model = body.model || 'gpt-4o-mini'

      let context = ''
      const toolChoice = body.tool_choice
      const tools = Array.isArray(body.tools) ? body.tools : []
      if (tools.length) {
        const wantsFileSearch = tools.some(t => t?.type === 'file_search') && toolChoice !== 'none'
        if (wantsFileSearch && body.metadata?.file_query) {
          const agentId = body.metadata.agent_id || appId
          const agentRecord = globalThis.__agents?.get(agentId)
          const folders = body.metadata.folders || agentRecord?.config?.folders || ['shared']
          const results = await searchSupabase({ agentId, query: body.metadata.file_query, topK: body.metadata.top_k || 5, folders })
          context = results.map(r => `# Context (from ${r.folder})\n${r.content}`).join('\n\n')
        }
      }

      const messages = body.messages || []
      const finalMessages = context ? [{ role: 'system', content: 'Use the following retrieved context when answering. If context is irrelevant, say so.' }, { role: 'system', content: context }, ...messages] : messages

      if (body.stream) {
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        const stream = await llm.chat.completions.create({ model, messages: finalMessages, stream: true })
        for await (const part of stream) {
          const delta = part.choices?.[0]?.delta || {}
          res.write(`data: ${JSON.stringify({ object: 'chat.completion.chunk', choices: [{ delta }] })}\n\n`)
        }
        res.write('data: [DONE]\n\n')
        return res.end()
      } else {
        const completion = await llm.chat.completions.create({ model, messages: finalMessages })
        const choice = completion.choices?.[0]
        return json(res, 200, {
          id: completion.id,
          model: model,
          object: 'chat.completion',
          choices: [{ index: 0, message: choice?.message }],
          usage: completion.usage || undefined
        })
      }
    }

    if (url.pathname.match(/^\/x-app\/[^/]+\/deploy$/) && req.method === 'POST') {
      const appId = url.pathname.split('/')[2]
      return json(res, 200, { appId, status: 'deployed', endpoints: { invoke: `/x-app/${appId}/invoke` } })
    }

    if (url.pathname.match(/^\/x-app\/[^/]+$/) && req.method === 'GET') {
      const appId = url.pathname.split('/')[2]
      return json(res, 200, { appId, health: 'ok' })
    }

    json(res, 404, { error: { type: 'not_found', message: 'Route not found', code: 'NOT_FOUND', run_id: runId } })
  } catch (err) {
    json(res, 500, { error: { type: 'internal_error', message: err.message, code: 'INTERNAL', param: null } })
  }
})

const port = process.env.PORT ? Number(process.env.PORT) : 3000
server.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})