import { downloadFile } from './supabase-files.js'

const requireEnv = () => {
  if (!process.env.SUPABASE_URL) throw new Error('Missing SUPABASE_URL')
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!publishable && !secret) throw new Error('Missing SUPABASE_PUBLISHABLE_KEY or SUPABASE_SECRET_KEY')
  if (!process.env.THIRD_PARTY_BASE_URL) throw new Error('Missing THIRD_PARTY_BASE_URL')
  if (!process.env.THIRD_PARTY_API_KEY) throw new Error('Missing THIRD_PARTY_API_KEY')
}

const getClients = async () => {
  requireEnv()
  const { createClient } = await import('@supabase/supabase-js')
  const OpenAI = (await import('openai')).default
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || publishable
  const supabase = createClient(process.env.SUPABASE_URL, secret)
  const llm = new OpenAI({ apiKey: process.env.THIRD_PARTY_API_KEY, baseURL: process.env.THIRD_PARTY_BASE_URL })
  return { supabase, llm }
}

const chunkText = (text, opts = {}) => {
  const size = opts.size || 1200
  const overlap = Math.min(opts.overlap || 200, size - 1)
  const step = Math.max(1, size - overlap)
  const chunks = []
  for (let i = 0; i < text.length; i += step) {
    const end = Math.min(text.length, i + size)
    chunks.push(text.slice(i, end))
    if (end === text.length) break
  }
  return chunks.filter(c => c && c.trim().length > 0)
}

const embed = async (llm, inputs, model = 'text-embedding-3-small') => {
  try {
    if (Array.isArray(inputs) && inputs.length > 1) {
      const out = []
      for (const inp of inputs) {
        const res = await llm.embeddings.create({ model, input: inp })
        out.push(res.data[0].embedding)
      }
      return out
    }
    const res = await llm.embeddings.create({ model, input: inputs })
    return res.data.map(d => d.embedding)
  } catch (e) {
    const err = new Error(`EMBEDDINGS_FAILED: ${e.message || e}`)
    throw err
  }
}

const extractFolder = (fileKey) => {
  const parts = fileKey.split('/')
  return parts.length > 1 ? parts[0] : 'shared'
}

export const indexSupabaseFile = async ({ bucket, fileKey, agentId, title, folder, chunkOptions, embeddingModel }) => {
  const { supabase, llm } = await getClients()
  let buf
  try {
    buf = await downloadFile(bucket, fileKey)
  } catch (e) {
    const err = new Error(e.message || 'DOWNLOAD_FAILED')
    err.details = { bucket, fileKey }
    throw err
  }
  const content = buf.toString('utf8')
  let chunks
  try {
    chunks = chunkText(content, chunkOptions)
  } catch (e) {
    const err = new Error(e.message || 'CHUNKING_FAILED')
    err.details = { contentLen: content.length, options: chunkOptions || null }
    throw err
  }
  let embeddings
  try {
    embeddings = await embed(llm, chunks, embeddingModel)
  } catch (e) {
    const err = new Error(e.message || 'EMBEDDINGS_FAILED')
    err.details = { chunkCount: chunks.length, sampleChunkLen: chunks[0]?.length || 0, model: embeddingModel || 'text-embedding-3-small' }
    throw err
  }
  if (!embeddings || embeddings.length !== chunks.length) {
    throw new Error(`EMBED_DIM_MISMATCH: count ${embeddings?.length || 0} != chunks ${chunks.length}`)
  }
  const dims = Array.from(new Set(embeddings.map(e => e?.length || 0)))
  if (dims.length !== 1 || dims[0] !== 1536) {
    throw new Error(`EMBED_DIM_MISMATCH: expected 1536, got ${dims.join(',')}`)
  }
  const docFolder = folder || extractFolder(fileKey)
  let doc
  try {
    const resDoc = await supabase.from('documents').insert({ 
      agent_id: agentId, 
      title: title || fileKey, 
      bucket, 
      file_key: fileKey,
      folder: docFolder
    }).select('*').single()
    if (resDoc.error) throw resDoc.error
    doc = resDoc.data
  } catch (e) {
    const err = new Error(e.message || 'DOC_INSERT_FAILED')
    err.details = { agentId, bucket, fileKey, folder: docFolder }
    throw err
  }
  const toInsertChunks = chunks.map((c, idx) => ({ document_id: doc.id, chunk_index: idx, content: c }))
  let insertedChunks
  try {
    const res = await supabase.from('chunks').insert(toInsertChunks).select('id,chunk_index')
    if (res.error) throw res.error
    insertedChunks = res.data
  } catch (e) {
    const err = new Error(e.message || 'CHUNKS_INSERT_FAILED')
    err.details = { chunkRows: toInsertChunks.length, first: toInsertChunks[0] ? Object.keys(toInsertChunks[0]) : [] }
    throw err
  }
  const byIndex = new Map(insertedChunks.map(c => [c.chunk_index, c.id]))
  const chunkIds = embeddings.map((_, idx) => byIndex.get(idx))
  const embedsText = embeddings.map(e => `[${e.join(',')}]`)
  try {
    const { error: embErr } = await supabase.rpc('insert_chunk_embeddings', { chunk_ids: chunkIds, embeds_text: embedsText })
    if (embErr) throw embErr
  } catch (e) {
    const err = new Error(e.message || 'EMBED_INSERT_FAILED')
    err.details = { chunkIdsCount: chunkIds.length, embedsCount: embeddings.length, embedDims: embeddings[0]?.length || 0 }
    throw err
  }
  return { documentId: doc.id, chunkCount: chunks.length }
}

export const searchSupabase = async ({ agentId, query, topK = 5, folders, embeddingModel }) => {
  const { supabase, llm } = await getClients()
  const [queryEmbedding] = await embed(llm, [query], embeddingModel)
  const searchFolders = folders || ['shared']
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('match_chunks', { 
      query_embedding: queryEmbedding, 
      match_count: topK, 
      agent_id: agentId,
      folders: searchFolders
    })
    if (!rpcErr && Array.isArray(rpcData)) {
      return rpcData.map(r => ({
        chunk_id: r.chunk_id || r.id,
        content: r.content,
        chunk_index: r.chunk_index,
        score: r.score || r.similarity || r.distance || 0,
        folder: r.folder || 'shared',
        document: { 
          id: r.document_id || r.document?.id, 
          title: r.title || r.document?.title, 
          bucket: r.bucket || r.document?.bucket, 
          file_key: r.file_key || r.document?.file_key,
          folder: r.folder || r.document?.folder || 'shared'
        }
      }))
    }
  } catch {}
  let dbQuery = supabase.from('documents').select('id, title, bucket, file_key, folder').eq('agent_id', agentId)
  if (searchFolders && searchFolders.length > 0 && !searchFolders.includes('*')) {
    dbQuery = dbQuery.in('folder', searchFolders)
  }
  const { data: docs, error: docErr } = await dbQuery
  if (docErr) throw docErr
  if (!docs || docs.length === 0) return []
  const docIds = docs.map(d => d.id)
  const { data: chunks, error: chunkErr } = await supabase.from('chunks').select('id, document_id, content, chunk_index').in('document_id', docIds)
  if (chunkErr) throw chunkErr
  if (!chunks || chunks.length === 0) return []
  const chunkIds = chunks.map(c => c.id)
  const { data: embeds, error: embErr } = await supabase.from('chunk_embeddings').select('chunk_id, embedding').in('chunk_id', chunkIds)
  if (embErr) throw embErr
  const byChunk = new Map(chunks.map(c => [c.id, c]))
  const byDoc = new Map(docs.map(d => [d.id, d]))
  const cosine = (a, b) => {
    let dot = 0, na = 0, nb = 0
    for (let i = 0; i < a.length && i < b.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i] }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
  }
  const scored = embeds.map(e => {
    const c = byChunk.get(e.chunk_id)
    const d = byDoc.get(c.document_id)
    return { 
      chunk_id: e.chunk_id, 
      content: c.content, 
      chunk_index: c.chunk_index, 
      score: cosine(queryEmbedding, e.embedding), 
      folder: d.folder || 'shared',
      document: { 
        id: d.id, 
        title: d.title, 
        bucket: d.bucket, 
        file_key: d.file_key,
        folder: d.folder || 'shared'
      } 
    }
  })
  scored.sort((x, y) => y.score - x.score)
  return scored.slice(0, topK)
}

export default {
  indexSupabaseFile,
  searchSupabase,
}
