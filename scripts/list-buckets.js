import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || publishable
const client = createClient(url, secret)

const run = async () => {
  const { data, error } = await client.storage.listBuckets()
  if (error) { console.error(error); process.exit(1) }
  console.log(JSON.stringify(data))
}

run().catch(e => { console.error(e); process.exit(1) })
