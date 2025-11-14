import 'dotenv/config'

const base = process.env.API_BASE || 'http://localhost:' + (process.env.PORT || 3000)

const run = async () => {
  const res = await fetch(base + '/diagnostics')
  const json = await res.json()
  console.log(JSON.stringify(json))
}

run().catch(e => { console.error(e); process.exit(1) })