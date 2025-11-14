import 'dotenv/config'

const base = process.env.API_BASE || 'http://localhost:' + (process.env.PORT || 3000)

const run = async () => {
  const res = await fetch(base + '/x-app/testapp/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
    body: JSON.stringify({ model: 'gpt-4o-mini', stream: true, messages: [{ role: 'user', content: 'Stream three short sentences.' }] })
  })
  const reader = res.body.getReader()
  let total = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    const chunk = Buffer.from(value).toString('utf8')
    process.stdout.write(chunk)
    total += chunk.length
  }
  console.log('\nbytes', total)
}

run().catch(e => { console.error(e); process.exit(1) })