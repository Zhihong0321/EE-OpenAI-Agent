import 'dotenv/config'
import { ensureBucket, uploadFile, getPublicUrl } from '../supabase-files.js'
import { indexSupabaseFile } from '../supabase-vector.js'

const bucket = process.env.SUPABASE_BUCKET || 'agent-files'
const fileArg = process.argv[2] || 'eternalgy_profile_2025_summary.md'
const destArg = process.argv[3] || undefined
const agentId = process.env.AGENT_ID || 'default'

const run = async () => {
  try { await ensureBucket(bucket, { public: false }) } catch {}
  console.log('upload:start')
  const up = await uploadFile(bucket, fileArg, destArg, { upsert: true })
  console.log('upload:done', up.path)
  console.log('public-url:start')
  const pub = await getPublicUrl(bucket, up.path)
  console.log('public-url:done')
  console.log('index:start')
  const idx = await indexSupabaseFile({ bucket, fileKey: up.path, agentId, title: up.path })
  console.log('index:done')
  console.log(JSON.stringify({ uploaded: up, publicUrl: pub, indexed: idx }))
}

run().catch(e => { console.error(e.message || e); process.exit(1) })
