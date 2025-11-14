import 'dotenv/config'

const base = process.env.API_BASE || 'http://localhost:' + (process.env.PORT || 3000)
const headers = { 'Content-Type': 'application/json' }
if (process.env.MANAGER_TOKEN) headers['Authorization'] = 'Bearer ' + process.env.MANAGER_TOKEN

const run = async () => {
  const bucket = process.env.SUPABASE_BUCKET || 'agent-files'
  const agentId = process.env.AGENT_ID || 'default'
  const filePath = 'test-upload.txt'

  const upRes = await fetch(base + '/manager/files/upload', {
    method: 'POST',
    headers,
    body: JSON.stringify({ bucket, file_path: filePath, upsert: true })
  })
  const up = await upRes.json()
  if (upRes.ok) {
    console.log('upload.key', up.key)
  } else {
    console.log('upload.error', up.error?.message || JSON.stringify(up))
  }

  const idxRes = await fetch(base + '/manager/index', {
    method: 'POST',
    headers,
    body: JSON.stringify({ bucket, file_key: up.key, agent_id: agentId })
  })
  const idx = await idxRes.json()
  if (idxRes.ok) {
    console.log('index.chunks', idx.chunkCount)
  } else {
    console.log('index.error', idx.error?.message || JSON.stringify(idx))
    console.log('index.details', idx.error?.details || null)
  }

  const searchRes = await fetch(base + '/manager/search', {
    method: 'POST',
    headers,
    body: JSON.stringify({ agent_id: agentId, query: 'company name', top_k: 3 })
  })
  const search = await searchRes.json()
  if (searchRes.ok) {
    const results = search.results || []
    console.log('search.count', results.length)
    if (results[0]) {
      console.log('search.top.title', results[0].document?.title)
      console.log('search.top.score', results[0].score)
    }
  } else {
    console.log('search.error', search.error?.message || JSON.stringify(search))
  }
}

run().catch(e => { console.error(e); process.exit(1) })